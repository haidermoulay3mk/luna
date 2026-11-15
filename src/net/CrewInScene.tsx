// Built with help from Claude (Anthropic).
// The other crew members' astronauts in the 3D world (online party), each with its role stripe and
// a name tag. Positions arrive 10 times a second; the astronauts glide between them smoothly.
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Astronaut, type Pose } from '../scene/walk/Astronaut';
import { angleLerp } from '../scene/walk/Player';
import { walkLive } from '../store/walk';
import { ROLES } from './crew';
import { remotePositions, useParty } from './party';

/** My arm-stripe colour: my crew role's colour (Power Engineer amber when playing solo). */
export function useMyBand(): string {
  const role = useParty((s) => s.members.find((m) => m.id === s.myId)?.role ?? 0);
  return ROLES[role]?.band ?? ROLES[0].band;
}

export function CrewInScene() {
  const members = useParty((s) => s.members);
  const myId = useParty((s) => s.myId);
  const status = useParty((s) => s.status);
  if (status !== 'playing') return null;
  return (
    <>
      {members
        .filter((m) => m.id !== myId)
        .map((m) => (
          <RemoteAstronaut key={m.id} id={m.id} name={m.name} band={ROLES[m.role]?.band ?? '#ffffff'} />
        ))}
    </>
  );
}

function RemoteAstronaut({ id, name, band }: { id: string; name: string; band: string }) {
  const group = useRef<Group>(null);
  const pose = useRef<Pose>({ speed: 0, air: false });
  const placed = useRef(false);
  useFrame((_, dt) => {
    const g = group.current;
    const p = remotePositions[id];
    if (!g) return;
    // Only astronauts on the same world (and walking, not flying) are drawn.
    const here = Boolean(p && p.world === walkLive.world && p.screen !== 'flight');
    g.visible = here;
    if (!p || !here) return;
    const k = placed.current ? Math.min(1, dt * 10) : 1;
    placed.current = true;
    g.position.x += (p.x - g.position.x) * k;
    g.position.y += (p.y - g.position.y) * k;
    g.position.z += (p.z - g.position.z) * k;
    g.rotation.y = angleLerp(g.rotation.y, p.yaw, k);
    pose.current.speed = p.speed;
    pose.current.air = p.air;
  });
  return (
    <group ref={group} visible={false}>
      <Astronaut pose={pose} band={band} />
      <Html position={[0, 2.25, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <span
          className="whitespace-nowrap border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white"
          style={{ borderColor: band, background: 'rgba(5,7,13,0.75)' }}
        >
          {name}
        </span>
      </Html>
    </group>
  );
}
