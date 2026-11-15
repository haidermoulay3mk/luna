// Built with help from Claude (Anthropic).
// Screen flow: name entry → tutorial (first time) → Moon map ⇄ rocket flight → mission → ending.
// The name, tutorial, map and ending screens share one 3D Moon, so its WebGL canvas stays
// alive while moving between them. The flight and the mission each have their own scene.
// Safety net: a screen that is missing what it needs shows a sensible screen instead, and a
// crash anywhere shows a recovery panel, so the player never sees a blank page.
import { Component, useEffect, type ReactNode } from 'react';
import { trackView } from './engine/campaign';
import { isOlympusEnding } from './engine/scoring';
import { useGameStore, type Screen } from './store/gameStore';
import { useSettings } from './store/settings';
import { DemoJump } from './ui/components/DemoJump';
import { SoundToggle } from './ui/components/Dialog';
import { MapBackdrop } from './ui/components/MapBackdrop';
import { ClickFx, ScreenWipe } from './ui/components/MotionFx';
import { StartGate } from './ui/components/StartGate';
import { ChapterComplete } from './ui/screens/ChapterComplete';
import { Credits } from './ui/screens/Credits';
import { Ending } from './ui/screens/Ending';
import { Board, EndingBackdrop, Summit } from './ui/screens/Expedition';
import { Party, PartyBar, usePartyCleanup } from './ui/screens/Party';
import { Flight } from './ui/screens/Flight';
import { Hop } from './ui/screens/Hop';
import { Home } from './ui/screens/Home';
import { Play } from './ui/screens/Play';
import { System } from './ui/screens/System';
import { Tutorial } from './ui/screens/Tutorial';
import { Welcome } from './ui/screens/Welcome';

export function App() {
  // Lite mode: no blur anywhere (`.lite .glass` in index.css).
  const lite = useSettings((s) => s.lite);
  useEffect(() => {
    document.documentElement.classList.toggle('lite', lite);
  }, [lite]);
  const screen = useShownScreen();
  usePartyCleanup();
  return (
    <StartGate>
      <AppBoundary>
        <Screens screen={screen} />
      </AppBoundary>
      {/* The title screen has its own mute button, top right. */}
      {screen !== 'welcome' && <SoundToggle />}
      <ClickFx />
      <ScreenWipe screen={screen} />
      <PartyBar />
      <DemoJump />
    </StartGate>
  );
}

/** The screen to draw: never one that would be empty (no commander yet, or no ending yet). */
function useShownScreen(): Screen {
  const screen = useGameStore((s) => s.screen);
  const progress = useGameStore((s) => s.progress);
  const chapterShown = useGameStore((s) => s.chapterShown);
  // Credits and the party lobby work before a commander signs in (a guest joins a friend's party).
  if (!progress) return screen === 'credits' || screen === 'party' ? screen : 'welcome';
  if (screen === 'ending' && !isOlympusEnding(trackView(progress, 'mars').ending)) return 'home';
  if (screen === 'chapter' && chapterShown === null) return 'home';
  return screen;
}

function Screens({ screen }: { screen: Screen }) {
  if (screen === 'welcome') return <Welcome />;
  if (screen === 'play') return <Play />;
  if (screen === 'flight') return <Flight />;
  if (screen === 'hop') return <Hop />;
  if (screen === 'system') return <System />;
  if (screen === 'credits') return <Credits />;
  if (screen === 'board') return <Board />;
  if (screen === 'summit') return <Summit />;
  if (screen === 'party') return <Party />;
  // The ending recap over the lit summit of Olympus Mons, in 3D.
  if (screen === 'ending')
    return (
      <EndingBackdrop>
        <Ending />
      </EndingBackdrop>
    );
  return (
    <MapBackdrop>
      {screen === 'tutorial' && <Tutorial />}
      {screen === 'home' && <Home />}
      {screen === 'chapter' && <ChapterComplete />}
    </MapBackdrop>
  );
}

/** Last line of defence: if a screen crashes, offer a way back instead of a blank page. */
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Luna screen error', error);
  }

  recover = () => {
    const { progress } = useGameStore.getState();
    useGameStore.setState({ screen: progress ? 'system' : 'welcome', whyOpen: false });
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid h-dvh place-items-center bg-space-950 p-4 text-white">
        <section role="alert" className="panel max-w-md p-6">
          <h1 className="font-display text-2xl font-bold">This screen hit a problem</h1>
          <p className="mt-2 text-ink-soft">Your progress is saved. Go back and carry on.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={this.recover} className="btn-primary">
              Back to the Solar System
            </button>
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
              Reload the game
            </button>
          </div>
        </section>
      </main>
    );
  }
}
