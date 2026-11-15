// Built with help from Claude (Anthropic).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled from @fontsource (not Google Fonts) so the USB build works offline.
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
// Flight Deck fonts (LUNA_BUILD A2.2): Michroma for the title and chapter names, JetBrains Mono for numbers and labels.
import '@fontsource/michroma/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './styles/index.css';
import { App } from './App';
import { useSpaceWeather } from './store/spaceWeather';

// Ask NASA for the latest space weather in the background; the game starts with the archived data.
void useSpaceWeather.getState().load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
