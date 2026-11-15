// Built with help from Claude (Anthropic).
// The party lobby (Crew Mode online): the crew stands side by side in front of the base, all in the
// same suit (only the role stripe differs), each with a name tag, their role and READY above them.
// Left: create a party (you get a code) or join one with a friend's code; then Ready / Start.
// Also the small party bar shown during play (who is in the crew, who has voted on the card).
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import type { Parts } from '../../engine/types';
import { ROLES } from '../../net/crew';
import { useParty, type Member } from '../../net/party';
import { SceneBoundary } from '../../scene/MoonbaseScene';
import { SUN_DIRECTION, Sky } from '../../scene/space/Sky';
import { DPR, isLowPowerDevice, useCan3D, watchContextLoss } from '../../scene/space/webgl';
import { Astronaut, type Pose } from '../../scene/walk/Astronaut';
import { BaseModel } from '../../scene/walk/BaseModel';
import { Terrain } from '../../scene/walk/Ground';
import { currentEvent, useGameStore } from '../../store/gameStore';
import { Frame, PrimaryButton } from '../components/deck';

/** Where each crew member stands in the line-up: you in the middle, friends either side. */
const SLOTS = [0, -1.7, 1.7, -3.4];
const LINE_Z = 18;
/** The lobby base is shown healthy (a backdrop, not a game value). */
const LOBBY_PARTS: Parts = { solar: 80, battery: 80, oxygen: 80, water: 80, food: 80, health: 80, morale: 80, radiation: 10 };

export function Party() {
  const can3D = useCan3D();
  const members = useParty((s) => s.members);
  const myId = useParty((s) => s.myId);
  const status = useParty((s) => s.status);
  const progressName = useGameStore((s) => s.progress?.name ?? 'You');
  // You in the centre; with no party yet, just you.
  const lineup = useMemo(() => {
    const me = members.find((m) => m.id === myId);
    const others = members.filter((m) => m.id !== myId);
    return [me ?? { id: 'me', name: progressName, role: 0, ready: true, host: true }, ...others];
  }, [members, myId, progressName]);
  return (
    <div className="relative h-dvh overflow-hidden bg-space-950 text-white">
      {can3D && (
        <div className="absolute inset-0">
          <LobbyScene lineup={lineup} showTags={status === 'lobby' || status === 'playing'} />
        </div>
      )}
      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:items-end lg:p-5">
        <LobbyPanel />
      </div>
    </div>
  );
}

function LobbyScene({ lineup, showTags }: { lineup: Member[]; showTags: boolean }) {
  const [lowPower] = useState(isLowPowerDevice);
  const thrust = useRef(0);
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        shadows={lowPower ? false : 'percentage'}
        camera={{ fov: 38, near: 0.1, far: 6000, position: [0.8, 2.2, LINE_Z + 8.5] }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        <color attach="background" args={['#020308']} />
        <LobbyCamera />
        <directionalLight
          position={[SUN_DIRECTION.x * 60, SUN_DIRECTION.y * 60 + 10, LINE_Z + SUN_DIRECTION.z * 60]}
          intensity={3}
          color="#fff6ea"
          castShadow={!lowPower}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        <hemisphereLight args={['#8ea4d8', '#5a5856', 0.35]} />
        <Sky stars={2400} />
        <Terrain world="moon" />
        <BaseModel world="moon" parts={LOBBY_PARTS} rocketThrust={thrust} reduced />
        {lineup.map((m, i) => (
          <LineupAstronaut key={m.id} member={m} x={SLOTS[i] ?? i * 1.7} showTag={showTags} delay={i * 0.7} />
        ))}
      </Canvas>
    </SceneBoundary>
  );
}

/** A slow drift so the line-up feels alive (still with reduced motion). */
function LobbyCamera() {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new Vector3(-0.6, 1.2, LINE_Z), []);
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  useFrame(({ clock }) => {
    if (!still) camera.position.x = 0.8 + Math.sin(clock.elapsedTime * 0.12) * 0.6;
    camera.lookAt(look);
  });
  return null;
}

function LineupAstronaut({ member, x, showTag, delay }: { member: Member; x: number; showTag: boolean; delay: number }) {
  const pose = useRef<Pose>({ speed: 0, air: false });
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    // Each one turns a little now and then, at its own time.
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.4 + delay) * 0.12;
  });
  const role = ROLES[member.role] ?? ROLES[0];
  return (
    <group ref={group} position={[x, 0, LINE_Z]}>
      <Astronaut pose={pose} band={role.band} />
      {showTag && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex min-w-[8rem] flex-col items-center gap-0.5 text-center">
            <span className="whitespace-nowrap font-display text-base font-bold text-white">{member.name}</span>
            <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: role.band }}>
              {role.name}
            </span>
            <span
              className={`whitespace-nowrap border px-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${member.ready || member.host ? 'border-ok text-ok' : 'border-line-strong text-ink-soft'}`}
            >
              {member.host ? '★ Host' : member.ready ? '● Ready' : '○ Not ready'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

function LobbyPanel() {
  const party = useParty();
  const progress = useGameStore((s) => s.progress);
  const [name, setName] = useState(progress?.name ?? '');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const back = () => {
    if (party.status !== 'playing') party.leave();
    useGameStore.setState({ screen: useGameStore.getState().progress ? 'system' : 'welcome' });
  };
  const me = party.members.find((m) => m.id === party.myId);
  const allReady = party.members.every((m) => m.ready);
  const inParty = party.status === 'lobby' || party.status === 'playing';
  const connecting = party.status === 'connecting';
  return (
    <Frame index="06" label="Crew mode · online party" className="pointer-events-auto w-full max-w-md" bodyClassName="flex flex-col gap-3 p-4">
      {!inParty && (
        <>
          <p className="text-base text-ink-soft">Play with friends on their own devices. One creates a party; the others join with its code.</p>
          <label className="flex flex-col gap-1">
            <span className="hud-label">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              className="rounded-btn border border-line bg-space-950 px-3 py-2 text-lg"
              placeholder="Astronaut name"
            />
          </label>
          <PrimaryButton onClick={() => void party.create(name)} disabled={connecting || !name.trim()}>
            {connecting && party.isHost ? 'Creating…' : 'Create a party'}
          </PrimaryButton>
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="hud-label">Friend's party code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="rounded-btn border border-line bg-space-950 px-3 py-2 font-mono text-lg uppercase tracking-[0.3em]"
                placeholder="ABCDE"
              />
            </label>
            <PrimaryButton secondary noArrow onClick={() => void party.join(code, name)} disabled={connecting || !name.trim() || code.trim().length !== 5}>
              {connecting && !party.isHost ? 'Joining…' : 'Join'}
            </PrimaryButton>
          </div>
        </>
      )}
      {inParty && party.code && (
        <div className="flex items-center justify-between gap-3 border border-line px-3 py-2">
          <div>
            <p className="hud-label">Party code</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em] text-sun">{party.code}</p>
          </div>
          <button
            type="button"
            className="btn-secondary min-h-11 px-3 text-sm"
            onClick={() => {
              void navigator.clipboard?.writeText(party.code ?? '').then(() => setCopied(true));
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {inParty && (
        <ul className="flex flex-col gap-1" aria-label="Crew">
          {party.members.map((m) => {
            const role = ROLES[m.role] ?? ROLES[0];
            return (
              <li key={m.id} className="flex items-center gap-2 border-b border-line py-1.5">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: role.band }} />
                <span className="flex-1 truncate font-display font-bold">
                  {m.name}
                  {m.id === party.myId && <span className="font-normal text-ink-faint"> (you)</span>}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">{role.name}</span>
                <span className={`font-mono text-[11px] font-bold ${m.ready || m.host ? 'text-ok' : 'text-ink-faint'}`}>{m.host ? '★' : m.ready ? '●' : '○'}</span>
              </li>
            );
          })}
        </ul>
      )}
      {inParty && party.isHost && party.status === 'lobby' && (
        <PrimaryButton onClick={party.start} disabled={!allReady}>
          {allReady ? 'Start the mission' : 'Waiting for everyone to be ready'}
        </PrimaryButton>
      )}
      {inParty && !party.isHost && party.status === 'lobby' && me && (
        <PrimaryButton onClick={() => party.setReady(!me.ready)} secondary={me.ready}>
          {me.ready ? 'Ready: waiting for the host' : "I'm ready"}
        </PrimaryButton>
      )}
      {inParty && <p className="text-sm text-ink-faint">The host's game is the mission. Everyone walks their own astronaut and votes on every decision. Majority wins.</p>}
      {party.error && (
        <p role="alert" className="border border-bad px-3 py-2 text-base text-white">
          ⬣ {party.error}
        </p>
      )}
      <div className="flex gap-2">
        {inParty && (
          <button type="button" className="btn-secondary min-h-11 flex-1 text-sm" onClick={party.leave}>
            Leave party
          </button>
        )}
        <button type="button" className="btn-secondary min-h-11 flex-1 text-sm" onClick={back}>
          {party.status === 'playing' ? 'Back to the mission' : 'Back'}
        </button>
      </div>
      <p className="text-sm text-ink-faint">Only your name is shared. No chat. Devices connect directly (PeerJS, free); party play needs internet.</p>
    </Frame>
  );
}

/** During play: the crew in a slim bar, with a dot for each member who has voted on the card. */
export function PartyBar() {
  const status = useParty((s) => s.status);
  const members = useParty((s) => s.members);
  const voted = useParty((s) => s.voted);
  const code = useParty((s) => s.code);
  const choosing = useGameStore((s) => s.screen === 'play' && s.step === 'playing' && s.state.phase === 'choosing' && Boolean(currentEvent(s)));
  if (status !== 'playing' || members.length < 2) return null;
  return (
    <div role="status" className="hud plain pointer-events-none fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 px-3 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Crew {code}</span>
      {members.map((m) => {
        const role = ROLES[m.role] ?? ROLES[0];
        const has = voted.includes(m.id);
        return (
          <span key={m.id} className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase" style={{ color: role.band }}>
            {choosing ? (has ? '●' : '○') : '■'} {m.name}
          </span>
        );
      })}
      {choosing && (
        <span className="font-mono text-[11px] text-ink-soft">
          {voted.length}/{members.length} voted
        </span>
      )}
    </div>
  );
}

/** Leaves the party when the page closes, so friends see the astronaut go. */
export function usePartyCleanup() {
  useEffect(() => {
    const bye = () => useParty.getState().leave();
    window.addEventListener('pagehide', bye);
    return () => window.removeEventListener('pagehide', bye);
  }, []);
}
