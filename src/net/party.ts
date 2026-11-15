// Built with help from Claude (Anthropic).
// Online party (Boss: "friends play together from their devices"): one player creates a party and
// gets a 5-letter code; friends type the code on their own device to join. Up to 4 astronauts.
//
// How it works: PeerJS (free, open source, no account) connects the browsers directly with WebRTC.
// PeerJS's free public server only introduces the devices to each other; game data then goes device
// to device. There is no Luna server and no account. Only the name each player types is shared.
// No chat (players are 7 to 12). Needs internet; the USB file still works offline for solo play.
//
// The host's game is the real one: guests see the host's mission (screen, cards, gauges) and vote
// on every decision; any crew member can walk to the mission site and start it. Every astronaut
// walks freely, and everyone sees everyone else's astronaut move.
import { create } from 'zustand';
import type { DataConnection, Peer } from 'peerjs';
import { missionById } from '../data/content';
import type { Progress } from '../engine/campaign';
import type { Mission, MissionState } from '../engine/types';
import { currentEvent, setActionGate, ungated, useGameStore, type GatedAction } from '../store/gameStore';
import { walkLive } from '../store/walk';
import { MAX_CREW, allVoted, cleanName, mainGauge, partyCode, tallyVotes } from './crew';

const PREFIX = 'luna-solone-party-';
/** How often positions are sent (ms): 10 times a second is smooth with interpolation. */
const POS_MS = 100;
/** Game updates are bundled for this long (ms) so a burst of changes is sent once. */
const SNAP_MS = 120;

export type PartyStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

export interface Member {
  id: string;
  name: string;
  /** Index into ROLES (join order). */
  role: number;
  ready: boolean;
  host: boolean;
}

export interface RemotePos {
  world: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  air: boolean;
  screen: string;
}

/** Other astronauts' latest positions (changes 10 times a second, so not in React state). */
export const remotePositions: Record<string, RemotePos> = {};

type Snapshot = {
  screen: string;
  world: string;
  missionId: number;
  state: MissionState;
  storyRun: boolean;
  step: string;
  briefingPage: number;
  outcome: unknown;
  solReports: unknown[];
  whyOpen: boolean;
  ripple: unknown;
  rippleOpen: boolean;
  chapterShown: number | null;
  flightTarget: number | null;
  arrival: unknown;
  weather: unknown;
  progress: Progress | null;
};

type Msg =
  | { t: 'hello'; name: string }
  | { t: 'roster'; members: Member[]; status: PartyStatus }
  | { t: 'ready'; ready: boolean }
  | { t: 'pos'; p: RemotePos }
  | { t: 'positions'; all: Record<string, RemotePos> }
  | { t: 'game'; snap: Snapshot }
  | { t: 'vote'; eventId: string; choiceId: string }
  | { t: 'votes'; voted: string[] }
  | { t: 'act'; name: GatedAction; args: unknown[] }
  | { t: 'full' };

interface PartyStore {
  status: PartyStatus;
  isHost: boolean;
  code: string | null;
  myId: string | null;
  members: Member[];
  error: string | null;
  /** Who has voted on the card on screen (the choices stay hidden until the crew decides, B6). */
  voted: string[];
  create: (name: string) => Promise<void>;
  join: (code: string, name: string) => Promise<void>;
  leave: () => void;
  setReady: (ready: boolean) => void;
  start: () => void;
}

// ---- Connection state (outside React) ----
let peer: Peer | null = null;
const conns = new Map<string, DataConnection>();
let hostConn: DataConnection | null = null;
let posTimer = 0;
let unsubscribe: (() => void) | null = null;
/** Host only: the votes on the current card, by member id. */
let votes: Record<string, string> = {};
let voteKey: string | null = null;

const errorText = (type: string | undefined): string => {
  if (type === 'peer-unavailable') return 'No party with that code. Check the code and try again.';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed')
    return 'Could not reach the party service. Party play needs internet.';
  if (type === 'browser-incompatible') return 'This browser cannot join online parties.';
  return 'The connection failed. Try again.';
};

async function makePeer(id?: string): Promise<Peer> {
  const { Peer: PeerClass } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const p = id ? new PeerClass(id, { debug: 0 }) : new PeerClass({ debug: 0 });
    const fail = (err: { type?: string }) => {
      p.destroy();
      reject(err);
    };
    p.once('open', () => {
      p.off('error', fail);
      resolve(p);
    });
    p.once('error', fail);
  });
}

type GameState = ReturnType<typeof useGameStore.getState>;

export const useParty = create<PartyStore>()((set, get) => {
  const send = (conn: DataConnection | null, msg: Msg) => {
    if (conn?.open) conn.send(msg);
  };
  const broadcast = (msg: Msg) => conns.forEach((c) => send(c, msg));
  const roster = () => broadcast({ t: 'roster', members: get().members, status: get().status });

  // ---- Host: votes ----
  const broadcastVotes = () => {
    const voted = Object.keys(votes);
    set({ voted });
    broadcast({ t: 'votes', voted });
  };
  const resolveVotes = (force: boolean) => {
    const store = useGameStore.getState();
    const event = currentEvent(store);
    if (!event || store.screen !== 'play' || store.step !== 'playing' || store.state.phase !== 'choosing') return;
    const voters = get().members.map((m) => ({ id: m.id, role: m.role }));
    if (!force && !allVoted(votes, voters)) return;
    const winner = tallyVotes(votes, voters, event.choices.map((c) => c.id), mainGauge(event));
    votes = {};
    broadcastVotes();
    ungated(() => (winner ? useGameStore.getState().choose(winner) : useGameStore.getState().timeout()));
  };
  const castVote = (memberId: string, eventId: string, choiceId: string) => {
    const event = currentEvent(useGameStore.getState());
    if (!event || event.id !== eventId) return;
    votes[memberId] = choiceId;
    broadcastVotes();
    resolveVotes(false);
  };

  // ---- Host: game updates to the guests ----
  const snapshot = (): Snapshot => {
    const s = useGameStore.getState();
    return {
      screen: s.screen,
      world: s.world,
      missionId: s.mission.id,
      state: s.state,
      storyRun: s.storyRun,
      step: s.step,
      briefingPage: s.briefingPage,
      outcome: s.outcome,
      solReports: s.solReports,
      whyOpen: s.whyOpen,
      ripple: s.ripple,
      rippleOpen: s.rippleOpen,
      chapterShown: s.chapterShown,
      flightTarget: s.flightTarget,
      arrival: s.arrival,
      weather: s.weather,
      progress: s.progress,
    };
  };
  const followGame = () => {
    let pending = 0;
    unsubscribe?.();
    unsubscribe = useGameStore.subscribe((s) => {
      // A new card on screen: fresh votes.
      const choosing = s.screen === 'play' && s.step === 'playing' && s.state.phase === 'choosing';
      const key = choosing ? `${s.mission.id}:${s.state.eventIndex}:${currentEvent(s)?.id ?? ''}` : null;
      if (key !== voteKey) {
        voteKey = key;
        votes = {};
        broadcastVotes();
      }
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        broadcast({ t: 'game', snap: snapshot() });
      }, SNAP_MS);
    });
  };

  // ---- Everyone: positions ----
  const startPositions = () => {
    window.clearInterval(posTimer);
    posTimer = window.setInterval(() => {
      const me = get().myId;
      if (!me) return;
      const p: RemotePos = {
        world: walkLive.world,
        x: walkLive.x,
        y: walkLive.y,
        z: walkLive.z,
        yaw: walkLive.yaw,
        speed: walkLive.speed,
        air: walkLive.air,
        screen: useGameStore.getState().screen,
      };
      if (get().isHost) broadcast({ t: 'positions', all: { ...remotePositions, [me]: p } });
      else send(hostConn, { t: 'pos', p });
    }, POS_MS);
  };

  const hostGate = (action: GatedAction, args: unknown[]): boolean => {
    if (get().members.length < 2) return false;
    if (action === 'choose') {
      const event = currentEvent(useGameStore.getState());
      const me = get().myId;
      if (event && me) castVote(me, event.id, String(args[0]));
      return true;
    }
    if (action === 'timeout') {
      resolveVotes(true);
      return true;
    }
    return false;
  };

  /** Guests can press the buttons that move the story on; the host's game does it. */
  const FORWARD = new Set<GatedAction>([
    'next',
    'nextBriefingPage',
    'skipBriefing',
    'begin',
    'reachObjective',
    'playNextStory',
    'launchToMars',
    'boardRocket',
    'showChapterComplete',
    'retry',
    'showSummit',
    'showEnding',
  ]);
  const guestGate = (action: GatedAction, args: unknown[]): boolean => {
    if (action === 'choose') {
      const event = currentEvent(useGameStore.getState());
      const me = get().myId;
      if (event && me) {
        send(hostConn, { t: 'vote', eventId: event.id, choiceId: String(args[0]) });
        set({ voted: [...new Set([...get().voted, me])] });
      }
    } else if (FORWARD.has(action)) send(hostConn, { t: 'act', name: action, args });
    return true;
  };

  const reset = () => {
    window.clearInterval(posTimer);
    unsubscribe?.();
    unsubscribe = null;
    setActionGate(null);
    conns.forEach((c) => c.close());
    conns.clear();
    hostConn?.close();
    hostConn = null;
    peer?.destroy();
    peer = null;
    votes = {};
    voteKey = null;
    for (const k of Object.keys(remotePositions)) delete remotePositions[k];
  };

  return {
    status: 'idle',
    isHost: false,
    code: null,
    myId: null,
    members: [],
    error: null,
    voted: [],

    create: async (rawName) => {
      const name = cleanName(rawName) || 'Commander';
      reset();
      set({ status: 'connecting', error: null, isHost: true, members: [], voted: [] });
      let made: Peer | null = null;
      let code = '';
      for (let tries = 0; tries < 3 && !made; tries++) {
        code = partyCode();
        try {
          made = await makePeer(PREFIX + code);
        } catch (err) {
          const type = (err as { type?: string }).type;
          if (type !== 'unavailable-id') {
            set({ status: 'error', error: errorText(type) });
            return;
          }
        }
      }
      if (!made) {
        set({ status: 'error', error: errorText(undefined) });
        return;
      }
      peer = made;
      const myId = made.id;
      set({ status: 'lobby', code, myId, members: [{ id: myId, name, role: 0, ready: true, host: true }] });
      made.on('connection', (conn) => {
        conn.on('data', (raw) => {
          const msg = raw as Msg;
          const members = get().members;
          if (msg.t === 'hello') {
            if (members.length >= MAX_CREW) {
              send(conn, { t: 'full' });
              window.setTimeout(() => conn.close(), 300);
              return;
            }
            const used = new Set(members.map((m) => m.role));
            const role = [0, 1, 2, 3].find((r) => !used.has(r)) ?? members.length;
            conns.set(conn.peer, conn);
            set({ members: [...members, { id: conn.peer, name: cleanName(msg.name) || 'Astronaut', role, ready: false, host: false }] });
            roster();
            if (get().status === 'playing') send(conn, { t: 'game', snap: snapshot() });
          } else if (!conns.has(conn.peer)) {
            return;
          } else if (msg.t === 'ready') {
            set({ members: members.map((m) => (m.id === conn.peer ? { ...m, ready: msg.ready } : m)) });
            roster();
          } else if (msg.t === 'pos') {
            remotePositions[conn.peer] = msg.p;
          } else if (msg.t === 'vote') {
            castVote(conn.peer, msg.eventId, msg.choiceId);
          } else if (msg.t === 'act' && FORWARD.has(msg.name)) {
            const action = (useGameStore.getState() as unknown as Record<string, (...a: unknown[]) => void>)[msg.name];
            if (typeof action === 'function') ungated(() => action(...(Array.isArray(msg.args) ? msg.args : [])));
          }
        });
        conn.on('close', () => {
          conns.delete(conn.peer);
          delete remotePositions[conn.peer];
          delete votes[conn.peer];
          set({ members: get().members.filter((m) => m.id !== conn.peer) });
          roster();
          resolveVotes(false);
        });
      });
      made.on('error', (err) => {
        if (err.type === 'network' || err.type === 'server-error') set({ error: errorText(err.type) });
      });
      setActionGate(hostGate);
      startPositions();
    },

    join: async (rawCode, rawName) => {
      const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const name = cleanName(rawName) || 'Astronaut';
      if (code.length !== 5) {
        set({ status: 'error', error: 'A party code has 5 letters and numbers.' });
        return;
      }
      reset();
      set({ status: 'connecting', error: null, isHost: false, code, members: [], voted: [] });
      let made: Peer;
      try {
        made = await makePeer();
      } catch (err) {
        set({ status: 'error', error: errorText((err as { type?: string }).type) });
        return;
      }
      peer = made;
      set({ myId: made.id });
      made.on('error', (err) => set({ status: 'error', error: errorText(err.type) }));
      const conn = made.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      hostConn = conn;
      conn.on('open', () => send(conn, { t: 'hello', name }));
      conn.on('data', (raw) => {
        const msg = raw as Msg;
        if (msg.t === 'roster') {
          set({ members: msg.members, status: msg.status === 'playing' ? 'playing' : 'lobby' });
        } else if (msg.t === 'full') {
          set({ status: 'error', error: 'That party is full (4 astronauts).' });
        } else if (msg.t === 'positions') {
          const me = get().myId;
          for (const [id, p] of Object.entries(msg.all)) if (id !== me) remotePositions[id] = p;
          for (const id of Object.keys(remotePositions)) if (!msg.all[id]) delete remotePositions[id];
        } else if (msg.t === 'votes') {
          set({ voted: msg.voted });
        } else if (msg.t === 'game') {
          const { missionId, ...rest } = msg.snap;
          const mission: Mission = missionById(missionId) ?? useGameStore.getState().mission;
          useGameStore.setState({ ...(rest as unknown as Partial<GameState>), mission });
          if (get().status !== 'playing') set({ status: 'playing' });
        }
      });
      conn.on('close', () => {
        if (get().status !== 'idle') set({ status: 'error', error: 'The host left the party.' });
        setActionGate(null);
        window.clearInterval(posTimer);
      });
      setActionGate(guestGate);
      startPositions();
    },

    leave: () => {
      reset();
      set({ status: 'idle', isHost: false, code: null, myId: null, members: [], error: null, voted: [] });
    },

    setReady: (ready) => {
      const me = get().myId;
      set({ members: get().members.map((m) => (m.id === me ? { ...m, ready } : m)) });
      send(hostConn, { t: 'ready', ready });
    },

    start: () => {
      if (!get().isHost) return;
      const game = useGameStore.getState();
      // The host's commander plays the story. A new host gets a commander named after them.
      if (!game.progress) {
        const me = get().members.find((m) => m.id === get().myId);
        game.signIn(me?.name ?? 'Commander', 'mission');
      } else if (game.screen === 'party') useGameStore.setState({ screen: 'system' });
      set({ status: 'playing' });
      followGame();
      roster();
      broadcast({ t: 'game', snap: snapshot() });
    },
  };
});
