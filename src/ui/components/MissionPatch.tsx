// Built with help from Claude (Anthropic).
// Mission patches (LUNA_BUILD B7): one per chapter, six to collect, drawn in code like real
// mission patches: a round badge, the chapter name around the top, an emblem in the middle.
import { useId } from 'react';
import type { Chapter } from '../../engine/chapters';

const AMBER = '#FFB547';
const INK = 'rgb(255 255 255 / 0.92)';

/** The emblem for each chapter, in a 120 × 120 box, centred on (60, 64). */
function Emblem({ id }: { id: number }) {
  const line = { fill: 'none', stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 1: // First Light: the Sun rising over the horizon, a solar panel catching it.
      return (
        <g>
          <path d="M34 78 H86" {...line} />
          <path d="M44 78 a16 16 0 0 1 32 0" fill={AMBER} />
          {[-60, -30, 0, 30, 60].map((a) => (
            <path key={a} d="M60 56 V48" {...line} stroke={AMBER} transform={`rotate(${a} 60 78)`} />
          ))}
          <path d="M70 90 l10 -6 l6 6 l-10 6 Z" {...line} />
        </g>
      );
    case 2: // Living Off the Land: a leaf and a drop of water.
      return (
        <g>
          <path d="M46 88 C46 64 62 50 82 48 C82 70 68 86 46 88 Z" {...line} />
          <path d="M46 88 L72 60" {...line} />
          <path d="M44 46 C44 46 36 56 36 61 a8 8 0 0 0 16 0 C52 56 44 46 44 46 Z" fill={AMBER} />
        </g>
      );
    case 3: // Keep It Running: a wrench across a gear.
      return (
        <g>
          <circle cx="60" cy="66" r="15" {...line} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M60 47 V43" {...line} transform={`rotate(${a} 60 66)`} />
          ))}
          <path d="M42 88 L74 56 a8 8 0 1 1 6 6 L48 94 Z" fill={AMBER} />
        </g>
      );
    case 4: // The Storm: a shelter shield and a solar flare.
      return (
        <g>
          <path d="M60 44 L80 52 V68 C80 80 70 88 60 92 C50 88 40 80 40 68 V52 Z" {...line} />
          <path d="M64 50 L52 70 H62 L56 86 L70 64 H60 Z" fill={AMBER} />
        </g>
      );
    case 5: // Red Landing: Mars and a lander touching down.
      return (
        <g>
          <circle cx="60" cy="90" r="22" fill="#B4532A" />
          <path d="M50 64 H70 L66 54 H54 Z" {...line} />
          <path d="M52 64 L46 74 M68 64 L74 74 M60 54 V48" {...line} />
          <circle cx="60" cy="46" r="2.5" fill={AMBER} />
        </g>
      );
    default: // The Climb: Olympus Mons and the station light at the summit.
      return (
        <g>
          <path d="M30 90 L52 58 H68 L90 90" {...line} />
          <path d="M52 58 C56 62 64 62 68 58" {...line} />
          <path d="M60 58 V40" {...line} />
          <path d="M60 40 L72 44 L60 48" fill={AMBER} />
          <circle cx="60" cy="58" r="3" fill={AMBER} />
        </g>
      );
  }
}

export function MissionPatch({ chapter, earned = true, size = 120, className = '' }: { chapter: Pick<Chapter, 'id' | 'title'>; earned?: boolean; size?: number; className?: string }) {
  const arcId = useId();
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Mission patch: Chapter ${chapter.id}, ${chapter.title}${earned ? '' : ' (not earned yet)'}`}
      className={className}
      style={{ opacity: earned ? 1 : 0.35 }}
    >
      <defs>
        <path id={arcId} d="M18 60 a42 42 0 0 1 84 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="#0A0E18" stroke={earned ? AMBER : 'rgb(255 255 255 / 0.4)'} strokeWidth="3" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="1" />
      <text fontSize="9" letterSpacing="1.6" fill={INK} className="font-mono" fontWeight="700">
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {chapter.title.toUpperCase()}
        </textPath>
      </text>
      <Emblem id={chapter.id} />
      <text x="60" y="110" textAnchor="middle" fontSize="8" letterSpacing="1.4" fill={earned ? AMBER : INK} className="font-mono" fontWeight="700">
        LUNA · CH {String(chapter.id).padStart(2, '0')}
      </text>
    </svg>
  );
}
