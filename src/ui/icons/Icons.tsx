// Built with help from Claude (Anthropic).
// Custom SVG icons (SPEC Part 7: no emoji as icons). 24×24 grid, stroke = currentColor,
// sized by font-size (1em), so `text-2xl` makes an icon bigger.
import type { ReactElement, ReactNode, SVGProps } from 'react';
import type { GaugeId, GaugeState } from '../../engine/types';

export type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

// ---- Gauges ----

export const PowerIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor" fillOpacity={0.2} />
  </Svg>
);

export const LifeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3v7.5M12 10.5 9.6 12.9M12 10.5l2.4 2.4" />
    <path
      d="M9.5 8.2C9.3 6.9 8.6 6 7.6 6 5 6 3 10.6 3 15.6 3 18 4.3 19.5 6.2 19.5c2.2 0 3.6-1.3 3.6-3.6z"
      fill="currentColor"
      fillOpacity={0.2}
    />
    <path
      d="M14.5 8.2C14.7 6.9 15.4 6 16.4 6 19 6 21 10.6 21 15.6 21 18 19.7 19.5 17.8 19.5c-2.2 0-3.6-1.3-3.6-3.6z"
      fill="currentColor"
      fillOpacity={0.2}
    />
  </Svg>
);

export const CrewIcon = (props: IconProps) => (
  <Svg {...props}>
    <path
      d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z"
      fill="currentColor"
      fillOpacity={0.2}
    />
  </Svg>
);

export const GAUGE_ICON: Record<GaugeId, (props: IconProps) => ReactElement> = {
  power: PowerIcon,
  life: LifeIcon,
  crew: CrewIcon,
};

// ---- States: shape as well as colour (SPEC 4.2) ----

export const GoodIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.6 2.6 5.6-5.7" />
  </Svg>
);

export const CautionIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3.2 2.6 19.8h18.8z" />
    <path d="M12 9.5v4.5M12 17.2h.01" />
  </Svg>
);

export const CriticalIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8.3 2.8h7.4l5.5 5.5v7.4l-5.5 5.5H8.3l-5.5-5.5V8.3z" />
    <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
  </Svg>
);

export function StateIcon({ state, ...props }: IconProps & { state: GaugeState }) {
  if (state === 'good') return <GoodIcon {...props} />;
  if (state === 'caution') return <CautionIcon {...props} />;
  return <CriticalIcon {...props} />;
}

// ---- Choice tags ----

export const GainIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
  </Svg>
);

export const CostIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
  </Svg>
);

/** A die: "this might happen". */
export const RiskIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="8.8" cy="8.8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.2" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

// ---- General ----

export const StarIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => (
  <Svg {...props}>
    <path
      d="m12 3 2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 17.06l-5.5 2.9 1.05-6.13L3.1 9.5l6.15-.9z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
);

export const ClockIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
  </Svg>
);

export const TargetIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const WhyIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.3-1.2.9-1.2 1.7v.4M12 17h.01" />
  </Svg>
);

export const SettingsIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Svg>
);

export const HelpIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-.9.4-1.5 1.2-1.5 2.2v.6M12 19h.01" />
  </Svg>
);

/** Broadcast arcs: the space-weather feed. */
export const SignalIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="6.5" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
    <path d="M6.5 11.5a6 6 0 0 1 6 6M6.5 6a11.5 11.5 0 0 1 11.5 11.5" />
  </Svg>
);

export const CloseIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const ChevronIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const HomeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 11.5 12 5l8 6.5M6.5 10v9h11v-9" />
    <path d="M10 19v-4.5h4V19" />
  </Svg>
);

export const LockIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
);

/** The Luna logo: a crescent Moon in a ring. */
export const LunaMark = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.2 6.6a5.6 5.6 0 1 0 0 10.8 4.6 4.6 0 0 1 0-10.8z" fill="currentColor" stroke="none" />
  </Svg>
);

export const RocketIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 2.8c3 2.3 4.3 5.6 4.3 9.2v4.5H7.7V12c0-3.6 1.3-6.9 4.3-9.2z" />
    <circle cx="12" cy="9.5" r="1.6" />
    <path d="M7.7 13.5 5 16.5v2.5l2.7-1.3M16.3 13.5l2.7 3v2.5l-2.7-1.3M10.5 19.5h3l-1.5 2.2z" />
  </Svg>
);

export const MapIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z" />
  </Svg>
);

export const PlusIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const MinusIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 12h14" />
  </Svg>
);

export const SunIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
  </Svg>
);

export const SoundIcon = ({ muted, ...props }: IconProps & { muted?: boolean }) => (
  <Svg {...props}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />}
  </Svg>
);
