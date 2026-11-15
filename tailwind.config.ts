// Built with help from Claude (Anthropic).
// Design tokens: the "Flight Deck" look (LUNA_BUILD.md A2.2, replaces README Part 7's palette).
// Change colours here, nowhere else.
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Solid near-black: page, panels, raised rows / hover.
        space: { 950: '#05070D', 900: '#0A0E18', 800: '#121826' },
        // Borders, leader lines and corner brackets.
        line: { DEFAULT: 'rgb(255 255 255 / 0.12)', strong: 'rgb(255 255 255 / 0.28)' },
        // Text: primary / secondary / labels. Nothing fainter than "faint".
        ink: { DEFAULT: 'rgb(255 255 255 / 0.92)', soft: 'rgb(255 255 255 / 0.68)', faint: 'rgb(255 255 255 / 0.55)' },
        regolith: '#9A9AA3',
        // The one accent: primary button, "you are here", selected, destination pin. Also the Power gauge.
        sun: '#FFB547',
        life: '#3DD6D0', // Life Support gauge only
        crew: '#FF6B8A', // Crew gauge only
        signal: '#7C9CFF', // focus ring only
        ok: '#4ADE80',
        warn: '#FACC15',
        bad: '#F87171',
        // Crew signature colours (README Part 3), used only on speaker names.
        nova: '#2EC4B6',
        rex: '#FF8A3D',
        luna: '#8BD450',
        bolt: '#FFD84D',
      },
      fontFamily: {
        // Game title and chapter names only: uppercase, never under 20 px.
        title: ['Michroma', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        // Every number, timer, label and data tag.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        panel: '10px',
        btn: '8px',
      },
      boxShadow: {
        panel: 'inset 0 1px 0 rgb(255 255 255 / 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
