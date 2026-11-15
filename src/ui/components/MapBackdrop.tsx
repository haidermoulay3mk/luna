// Built with help from Claude (Anthropic).
// The 3D Moon behind the welcome, tutorial, home and ending screens. One canvas stays alive
// while moving between them; only on the home screen can you spin, zoom and click pins.
import type { ReactNode } from 'react';
import { ORDERS, START_PLACES, type Place } from '../../data/content';
import { isUnlocked, trackView } from '../../engine/campaign';
import { MoonMap, type PinStatus } from '../../scene/MoonMap';
import { useGameStore } from '../../store/gameStore';
import { useMapUi } from '../../store/mapUi';

export function MapBackdrop({ children }: { children: ReactNode }) {
  const screen = useGameStore((s) => s.screen);
  const progress = useGameStore((s) => s.progress);
  const world = useGameStore((s) => s.world);
  const view = progress ? trackView(progress, world) : null;
  const order = ORDERS[world];
  const selected = useMapUi((s) => s.selected);
  const select = useMapUi((s) => s.select);
  const interactive = screen === 'home';

  const status = (place: Place): PinStatus => {
    if (place.kind === 'station') return 'station';
    if (place.missions.length === 0) return 'landmark';
    if (place.kind === 'orbit') return 'landmark';
    if (!view) return 'locked';
    const next = order[view.storyIndex];
    if (next !== undefined && place.missions.includes(next)) return 'next';
    return place.missions.some((id) => isUnlocked(view, id, order)) ? 'done' : 'locked';
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      <div className="absolute inset-0">
        <MoonMap
          world={world}
          interactive={interactive}
          selected={interactive ? selected : null}
          onSelect={select}
          location={view?.location ?? START_PLACES[world]}
          status={status}
        />
        <p className="sr-only">3D map of {world === 'mars' ? 'Mars' : 'the Moon'} made from NASA's real photos of its surface.</p>
      </div>
      <div className={`relative z-10 h-full overflow-y-auto p-3 lg:p-5 ${interactive ? 'pointer-events-none' : ''}`}>{children}</div>
    </div>
  );
}
