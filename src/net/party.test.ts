// Built with help from Claude (Anthropic).
// Online party: a friend types the code and really joins (Boss: "it says joining, but you never
// actually join"). PeerJS is replaced by an in-memory fake that behaves like the real one where it
// matters: the "json" channel drops messages over 16 KB, the server can drop the host, and a link
// can hang without ever opening or failing.
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => {
  type Fn = (...a: unknown[]) => void;
  class Emitter {
    private handlers = new Map<string, Fn[]>();
    on(e: string, f: Fn) {
      this.handlers.set(e, [...(this.handlers.get(e) ?? []), f]);
      return this;
    }
    once(e: string, f: Fn) {
      const w = Object.assign((...a: unknown[]) => {
        this.off(e, f);
        f(...a);
      }, { orig: f });
      return this.on(e, w);
    }
    off(e: string, f: Fn) {
      this.handlers.set(e, (this.handlers.get(e) ?? []).filter((h) => h !== f && (h as { orig?: Fn }).orig !== f));
      return this;
    }
    emit(e: string, ...a: unknown[]) {
      for (const h of [...(this.handlers.get(e) ?? [])]) h(...a);
    }
  }
  const server = new Map<string, FakePeer>();
  const opts = { stallLinks: 0, stallForever: false };
  let guests = 0;

  class FakeConn extends Emitter {
    open = false;
    closed = false;
    other: FakeConn | null = null;
    constructor(public peer: string, public serialization: string) {
      super();
    }
    send(data: unknown) {
      const size = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      // Real PeerJS 1.5: the json channel refuses anything this big (no error reaches the sender).
      if (this.serialization === 'json' && size >= 16300) return;
      const to = this.other;
      if (this.open && to) setTimeout(() => to.open && to.emit('data', data), 1);
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      this.open = false;
      this.emit('close');
      this.other?.close();
    }
  }

  class FakePeer extends Emitter {
    id: string;
    disconnected = false;
    destroyed = false;
    constructor(idOrOptions?: unknown) {
      super();
      this.id = typeof idOrOptions === 'string' ? idOrOptions : `guest-${++guests}`;
      setTimeout(() => this.register(), 5);
    }
    private register() {
      if (this.destroyed) return;
      server.set(this.id, this);
      this.emit('open', this.id);
    }
    connect(dst: string, o: { serialization: string }) {
      const mine = new FakeConn(dst, o.serialization);
      setTimeout(() => {
        const host = server.get(dst);
        if (!host || host.disconnected) {
          this.emit('error', { type: 'peer-unavailable' });
          return;
        }
        if (opts.stallForever || opts.stallLinks > 0) {
          opts.stallLinks--;
          return; // the offer vanishes: no answer, no error (a frozen or unreachable device)
        }
        const theirs = new FakeConn(this.id, o.serialization);
        mine.other = theirs;
        theirs.other = mine;
        host.emit('connection', theirs);
        mine.open = theirs.open = true;
        theirs.emit('open');
        mine.emit('open');
      }, 20);
      return mine;
    }
    /** The server dropped this device (e.g. the phone switched to WhatsApp to send the code). */
    dropFromServer() {
      server.delete(this.id);
      this.disconnected = true;
      this.emit('error', { type: 'network' });
      this.emit('disconnected', this.id);
    }
    reconnect() {
      if (!this.disconnected) throw new Error('not disconnected');
      this.disconnected = false;
      setTimeout(() => this.register(), 5);
    }
    destroy() {
      this.destroyed = true;
      this.disconnected = true;
      server.delete(this.id);
    }
  }
  return { server, opts, FakePeer, reset: () => { server.clear(); opts.stallLinks = 0; opts.stallForever = false; } };
});

vi.mock('peerjs', () => ({ Peer: net.FakePeer }));

/** Each device gets its own copy of the game and the party code, like two real browsers. */
async function device() {
  vi.resetModules();
  await import('peerjs'); // loaded up front: party.ts imports it lazily, outside the fake clock
  const party = await import('./party');
  const game = await import('../store/gameStore');
  return { useParty: party.useParty, useGameStore: game.useGameStore, JOIN_TIMEOUT_MS: party.JOIN_TIMEOUT_MS };
}

const flush = (ms = 200) => vi.advanceTimersByTimeAsync(ms);

describe('online party: joining a friend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    net.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function hostParty() {
    const host = await device();
    void host.useParty.getState().create('Maya');
    await flush();
    const code = host.useParty.getState().code;
    expect(host.useParty.getState().status).toBe('lobby');
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
    return { host, code: code as string };
  }

  it('a friend types the code and lands in the lobby with the host', async () => {
    const { host, code } = await hostParty();
    const guest = await device();
    void guest.useParty.getState().join(code.toLowerCase(), 'Sami');
    await flush();
    expect(guest.useParty.getState().status).toBe('lobby');
    expect(guest.useParty.getState().members.map((m) => m.name)).toEqual(['Maya', 'Sami']);
    expect(host.useParty.getState().members.map((m) => m.name)).toEqual(['Maya', 'Sami']);
  });

  it('the guest really gets the host game when it starts, even a big update (over 16 KB)', async () => {
    const { host, code } = await hostParty();
    const guest = await device();
    void guest.useParty.getState().join(code, 'Sami');
    await flush();
    guest.useParty.getState().setReady(true);
    await flush();
    // A large but ordinary game update (the old json channel silently dropped these).
    host.useGameStore.setState({ weather: { note: 'x'.repeat(40000) } as never });
    host.useParty.getState().start();
    await flush(500);
    expect(guest.useParty.getState().status).toBe('playing');
    expect(guest.useGameStore.getState().screen).toBe(host.useGameStore.getState().screen);
    expect((guest.useGameStore.getState().weather as unknown as { note: string }).note).toHaveLength(40000);
  });

  it('the host phone dropping off the party service comes back, and the friend can still join', async () => {
    const { host, code } = await hostParty();
    const hostPeer = net.server.get(`luna-solone-party-${code}`)!;
    hostPeer.dropFromServer();
    expect(host.useParty.getState().error).not.toBeNull();
    await flush(3000);
    expect(net.server.has(`luna-solone-party-${code}`)).toBe(true);
    expect(host.useParty.getState().error).toBeNull();
    const guest = await device();
    void guest.useParty.getState().join(code, 'Sami');
    await flush();
    expect(guest.useParty.getState().status).toBe('lobby');
  });

  it('a link that hangs is tried again instead of "Joining…" forever', async () => {
    const { host, code } = await hostParty();
    net.opts.stallLinks = 1;
    const guest = await device();
    void guest.useParty.getState().join(code, 'Sami');
    await flush(1000);
    expect(guest.useParty.getState().status).toBe('connecting');
    await flush(7000);
    expect(guest.useParty.getState().status).toBe('lobby');
    // The friend shows up once, not twice.
    expect(host.useParty.getState().members).toHaveLength(2);
  });

  it('if the party can never be reached, joining stops with a clear message', async () => {
    const { code } = await hostParty();
    net.opts.stallForever = true;
    const guest = await device();
    void guest.useParty.getState().join(code, 'Sami');
    await flush(guest.JOIN_TIMEOUT_MS + 500);
    const s = guest.useParty.getState();
    expect(s.status).toBe('error');
    expect(s.error).toMatch(/Could not reach your friend's party/);
  });

  it('a wrong code says so (after looking twice)', async () => {
    await hostParty();
    const guest = await device();
    void guest.useParty.getState().join('ZZZZZ', 'Sami');
    await flush(5000);
    expect(guest.useParty.getState().status).toBe('error');
    expect(guest.useParty.getState().error).toMatch(/No party with that code/);
  });
});
