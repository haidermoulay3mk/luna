// Built with help from Claude (Anthropic).
// The world map (the Moon or Mars), like a globe in a maps app: drag to spin, scroll or pinch
// to zoom, and click a pin to fly the camera there. Pins sit on real places; outposts are game-only.
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { STATION_HEIGHT, placesOn, type Place } from '../data/content';
import type { WorldId } from '../engine/campaign';
import { MOON_RADIUS, latLonToVec } from '../engine/flight';
import { usePrefersReducedMotion } from '../ui/hooks';
import { MeshCounter, SceneBoundary, SceneFallback } from './MoonbaseScene';
import { Rocket, Station } from './space/Craft';
import { SpaceLights, World } from './space/Moon';
import { Sky } from './space/Sky';
import { DPR, FpsWatch, isLowPowerDevice, useCan3D, watchContextLoss } from './space/webgl';

/** How a pin is drawn: the next mission glows, finished ones are calm, landmarks are grey. */
export type PinStatus = 'next' | 'done' | 'locked' | 'landmark' | 'station';

export interface MoonMapProps {
  world: WorldId;
  /** Pins and the camera can be used (home). Otherwise the globe turns slowly behind other screens. */
  interactive: boolean;
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Where the rocket is parked. */
  location?: string;
  status?: (place: Place) => PinStatus;
}

/** Commands for the zoom buttons on the home screen (set while the map is on screen). */
export const mapControls = { zoom: (_factor: number) => {}, reset: () => {} };

export const placePosition = (place: Place): Vector3 => {
  const height = place.kind === 'station' || place.kind === 'orbit' ? STATION_HEIGHT : 0.35;
  return new Vector3(...latLonToVec(place.lat, place.lon, MOON_RADIUS + height));
};

/** Where the camera starts: looking at the home base region of each world. */
const HOME_VIEWS: Record<WorldId, Vector3> = {
  moon: new Vector3(...latLonToVec(-38, 30, 1)).multiplyScalar(MOON_RADIUS * 3.1),
  // The Mars base and the camps are on the west side of Olympus Mons.
  mars: new Vector3(...latLonToVec(15, -138, 1)).multiplyScalar(MOON_RADIUS * 3.1),
};

export function MoonMap(props: MoonMapProps) {
  const webgl = useCan3D();
  const [lowPower] = useState(isLowPowerDevice);
  if (!webgl) return <SceneFallback text="This device can't show the 3D Moon. Use the mission list instead." />;
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        camera={{ position: HOME_VIEWS[props.world].toArray(), fov: 40, near: 0.5, far: 9000 }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={watchContextLoss}
        aria-hidden={!props.interactive}
      >
        <color attach="background" args={['#020308']} />
        <SpaceLights />
        {/* From Mars the Earth is only a bright dot, so the big Earth is drawn only near the Moon. */}
        <Sky earth={props.world === 'moon'} />
        <Suspense fallback={null}>
          <World key={props.world} world={props.world} segments={lowPower ? 96 : 160} />
        </Suspense>
        <MapContent {...props} />
        <FpsWatch />
        {import.meta.env.DEV && <MeshCounter />}
      </Canvas>
    </SceneBoundary>
  );
}

function MapContent({ world, interactive, selected, onSelect, location, status }: MoonMapProps) {
  const places = useMemo(() => placesOn(world), [world]);
  const homeView = HOME_VIEWS[world];
  const reduced = usePrefersReducedMotion();
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const flight = useRef<{ from: Vector3; to: Vector3; t: number } | null>(null);

  // Fly the camera to a place: keep looking at the Moon's centre, swing round to the place.
  const flyTo = (target: Vector3, distance: number) => {
    const to = target.clone().normalize().multiplyScalar(distance);
    if (reduced) {
      camera.position.copy(to);
      controls.current?.update();
      return;
    }
    flight.current = { from: camera.position.clone(), to, t: 0 };
  };

  useEffect(() => {
    mapControls.zoom = (factor) => {
      const d = Math.min(MOON_RADIUS * 4.5, Math.max(MOON_RADIUS * 1.18, camera.position.length() * factor));
      flyTo(camera.position, d);
    };
    mapControls.reset = () => flyTo(homeView, homeView.length());
    return () => {
      mapControls.zoom = () => {};
      mapControls.reset = () => {};
    };
  });

  useEffect(() => {
    const place = places.find((p) => p.id === selected);
    if (place && interactive) flyTo(placePosition(place), MOON_RADIUS * (place.kind === 'station' ? 2.2 : 1.65));
    // flyTo only uses refs and settings that don't change between selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, interactive]);

  // Switching between the Moon and Mars: start from that world's home view.
  useEffect(() => {
    camera.position.copy(homeView);
    controls.current?.update();
  }, [world, camera, homeView]);

  const q = useMemo(() => new Quaternion(), []);
  const step = useMemo(() => new Quaternion(), []);
  useFrame((_, dt) => {
    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt / 1.1);
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
      // Swing along the sphere (slerp of directions) while changing distance.
      const fromDir = f.from.clone().normalize();
      q.setFromUnitVectors(fromDir, f.to.clone().normalize());
      step.identity().slerp(q, e);
      const dir = fromDir.applyQuaternion(step);
      camera.position.copy(dir.multiplyScalar(f.from.length() + (f.to.length() - f.from.length()) * e));
      if (f.t >= 1) flight.current = null;
    }
    const c = controls.current;
    if (c) {
      // Like a maps app: spinning slows down as you zoom in.
      c.rotateSpeed = Math.min(0.6, Math.max(0.06, (camera.position.length() - MOON_RADIUS) / (MOON_RADIUS * 3)));
      c.update();
    }
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        enabled={interactive}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={MOON_RADIUS * 1.18}
        maxDistance={MOON_RADIUS * 4.5}
        zoomSpeed={0.7}
        autoRotate={!interactive && !reduced}
        autoRotateSpeed={0.25}
      />
      {places.map((place) => (
        <Pin
          key={place.id}
          place={place}
          status={status?.(place) ?? 'landmark'}
          selected={selected === place.id}
          interactive={interactive}
          onSelect={onSelect}
        />
      ))}
      <StationModel places={places} />
      {interactive && location && <ParkedRocket places={places} location={location} reduced={reduced} />}
    </>
  );
}

const PIN_COLOR: Record<PinStatus, string> = {
  next: '#FFB547',
  done: '#4ade80',
  locked: '#8e96a8',
  landmark: '#d6d9e0',
  station: '#ffb547',
};

function Pin({
  place,
  status,
  selected,
  interactive,
  onSelect,
}: {
  place: Place;
  status: PinStatus;
  selected: boolean;
  interactive: boolean;
  onSelect?: (id: string) => void;
}) {
  const position = useMemo(() => placePosition(place), [place]);
  const label = useRef<HTMLDivElement>(null);
  const toCamera = useMemo(() => new Vector3(), []);
  const normal = useMemo(() => position.clone().normalize(), [position]);
  useFrame(({ camera }) => {
    if (!label.current) return;
    // Hide labels on the far side of the Moon.
    toCamera.copy(camera.position).sub(position).normalize();
    const facing = toCamera.dot(normal);
    const high = place.kind === 'station' || place.kind === 'orbit';
    const visible = high || facing > 0.08;
    label.current.style.opacity = visible ? String(high ? 1 : Math.min(1, facing * 4)) : '0';
    label.current.style.pointerEvents = visible && interactive ? 'auto' : 'none';
  });
  const big = status === 'next' || selected;
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[big ? 0.9 : 0.55, 16, 12]} />
        <meshBasicMaterial color={PIN_COLOR[status]} />
      </mesh>
      {interactive && (
        <Html center zIndexRange={[20, 0]} style={{ transform: 'translateY(-26px)' }}>
          <div ref={label} style={{ opacity: 0 }} className="transition-opacity duration-200">
            <button
              type="button"
              onClick={() => onSelect?.(place.id)}
              className={`map-pin ${selected ? 'map-pin-selected' : ''} ${status === 'next' ? 'map-pin-next' : ''}`}
              aria-label={`${place.name}. ${place.where}.`}
            >
              <span aria-hidden className="map-pin-dot" style={{ background: PIN_COLOR[status] }} />
              {place.name}
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

function StationModel({ places }: { places: Place[] }) {
  const station = places.find((p) => p.kind === 'station');
  const ref = useRef<Group>(null);
  const position = useMemo(() => (station ? placePosition(station) : new Vector3()), [station]);
  useEffect(() => {
    // Docking port (the model's -y) faces the Moon.
    ref.current?.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), position.clone().normalize());
  }, [position]);
  if (!station) return null;
  return (
    <group ref={ref} position={position} scale={0.55}>
      <Station />
    </group>
  );
}

/** Your rocket, standing above the place it is parked. */
function ParkedRocket({ places, location, reduced }: { places: Place[]; location: string; reduced: boolean }) {
  const place = places.find((p) => p.id === location);
  const ref = useRef<Group>(null);
  const thrust = useRef(0.15);
  const base = useMemo(() => (place ? placePosition(place) : new Vector3()), [place]);
  const nose = useMemo(() => new Vector3(0, 0, 1), []);
  useFrame(({ clock }) => {
    if (!ref.current || !place) return;
    const up = base.clone().normalize();
    const lift = place.kind === 'station' ? -6 : place.kind === 'orbit' ? 0 : 3.2 + (reduced ? 0 : Math.sin(clock.elapsedTime * 1.4) * 0.25);
    ref.current.position.copy(base).addScaledVector(up, lift);
    // Nose (+z) away from the Moon.
    ref.current.quaternion.setFromUnitVectors(nose, up);
  });
  if (!place) return null;
  return <Rocket ref={ref} thrust={thrust} reduced={reduced} />;
}
