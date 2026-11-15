// Built with help from Claude (Anthropic).
// The title screen's hero (LUNA_BUILD A2.5): one huge real planet on the right, about 60% of the
// screen height, cropped by the screen edge and lit from the left. Lite mode: the same NASA map
// drawn as a shaded circle in CSS, over the CSS stars.
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import earthUrl from '../assets/earth-1k.jpg';
import marsUrl from '../assets/mars-color-2k.jpg';
import moonUrl from '../assets/moon-color-2k.jpg';
import { usePrefersReducedMotion } from '../ui/hooks';
import { SceneBoundary } from './MoonbaseScene';
import { Planet, type Body } from './space/Planet';
import { Sky } from './space/Sky';
import { DPR, FpsWatch, isLowPowerDevice, useCan3D, watchContextLoss } from './space/webgl';

const FOV = 30;
const DISTANCE = 6.2;
const LITE_MAP: Record<Body, string> = { earth: earthUrl, moon: moonUrl, mars: marsUrl };

export function HeroScene({ body = 'moon' }: { body?: Body }) {
  const webgl = useCan3D();
  const [lowPower] = useState(isLowPowerDevice);
  if (!webgl) return <LiteHero body={body} />;
  return (
    <div aria-hidden className="absolute inset-0">
    <SceneBoundary>
      <Canvas dpr={DPR} camera={{ fov: FOV, position: [0, 0, DISTANCE], near: 0.1, far: 9000 }} gl={{ antialias: !lowPower }} onCreated={watchContextLoss} aria-hidden>
        <color attach="background" args={['#05070D']} />
        <Sky earth={false} sun={false} stars={lowPower ? 1500 : 2800} />
        {/* Lit from the left: a bright day side and a dark night side. */}
        <directionalLight position={[-6, 1.6, 3.2]} intensity={2.8} color="#fff6ea" />
        <ambientLight intensity={0.04} />
        <Suspense fallback={null}>
          <HeroPlanet body={body} lowPower={lowPower} />
        </Suspense>
        <FpsWatch />
      </Canvas>
    </SceneBoundary>
    </div>
  );
}

/** Places the planet so it fills about 60% of the height, cropped by the right edge (top right on phones). */
function HeroPlanet({ body, lowPower }: { body: Body; lowPower: boolean }) {
  const size = useThree((s) => s.size);
  const reduced = usePrefersReducedMotion();
  const halfH = DISTANCE * Math.tan((FOV / 2) * (Math.PI / 180));
  const aspect = size.width / Math.max(1, size.height);
  const halfW = halfH * aspect;
  const portrait = aspect < 1;
  const radius = portrait ? halfW * 0.85 : halfH * 0.6;
  const x = portrait ? halfW * 0.45 : halfW - radius * 0.55;
  const y = portrait ? halfH - radius * 0.7 : halfH * 0.08;
  return (
    <group position={[x, y, 0]}>
      <Planet body={body} radius={radius} segments={lowPower ? 48 : 64} reduced={reduced} />
    </group>
  );
}

/** Lite mode: the NASA map as a shaded circle (no WebGL). */
function LiteHero({ body }: { body: Body }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute right-[-18vh] top-[12vh] aspect-square h-[62vh] rounded-full max-sm:right-[-25vw] max-sm:top-[-6vh] max-sm:h-auto max-sm:w-[85vw]"
        style={{
          backgroundImage: `radial-gradient(circle at 28% 45%, transparent 35%, rgb(5 7 13 / 0.55) 62%, rgb(5 7 13 / 0.96) 80%), url(${LITE_MAP[body]})`,
          backgroundSize: 'cover, 200% 100%',
          backgroundPosition: 'center, 30% center',
        }}
      />
    </div>
  );
}
