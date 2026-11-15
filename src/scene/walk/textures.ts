// Built with help from Claude (Anthropic).
// Textures drawn once in code on a canvas (CLAUDE.md rule 2: no image files or AI images):
// white hull panels with seams for the base, fine regolith grain for the ground, solar cells.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const cache = new Map<string, CanvasTexture>();

function draw(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void, srgb = true): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  if (srgb) texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Repeatable 0–1 noise for painting (fixed seed, so every visit looks the same). */
function painter(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

/** White module skin: large panels, thin dark seams, a copper stripe, vents, dust low down. */
export function getPanelTexture(): CanvasTexture {
  return draw('panel', 512, (ctx, size) => {
    const rand = painter(11);
    ctx.fillStyle = '#e9e9e6';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 64) {
      for (let x = 0; x < size; x += 128) {
        const shade = 224 + Math.floor(rand() * 20);
        ctx.fillStyle = `rgb(${shade},${shade},${shade - 2})`;
        ctx.fillRect(x + 2, y + 2, 124, 60);
      }
    }
    ctx.strokeStyle = 'rgba(60,64,72,0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += 64) {
      const offset = (y / 64) % 2 ? 64 : 0;
      for (let x = offset; x < size; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(170,112,60,0.6)';
    ctx.fillRect(0, 300, size, 6);
    ctx.fillStyle = 'rgba(40,44,52,0.6)';
    for (let x = 20; x < size; x += 96) ctx.fillRect(x, 330, 40, 10);
    const grad = ctx.createLinearGradient(0, size * 0.75, 0, size);
    grad.addColorStop(0, 'rgba(120,118,112,0)');
    grad.addColorStop(1, 'rgba(120,118,112,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, size * 0.75, size, size * 0.25);
  });
}

/** Fine grain for the ground: pebbles and speckles, tiled every few metres. Greyscale (the colour comes from the terrain). */
export function getGrainTexture(): CanvasTexture {
  return draw(
    'grain',
    512,
    (ctx, size) => {
      const rand = painter(5);
      ctx.fillStyle = '#b4b4b4';
      ctx.fillRect(0, 0, size, size);
      // Soft blotches: patches of darker and lighter soil, so the tiling is not obvious.
      for (let i = 0; i < 90; i++) {
        const v = 150 + Math.floor(rand() * 70);
        ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
        ctx.beginPath();
        ctx.ellipse(rand() * size, rand() * size, 20 + rand() * 60, 14 + rand() * 40, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Small craters: a dark inner wall on the sun side, a bright rim on the far side.
      for (let i = 0; i < 70; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 3 + rand() * rand() * 22;
        ctx.fillStyle = 'rgba(70,70,70,0.35)';
        ctx.beginPath();
        ctx.arc(x - r * 0.12, y - r * 0.12, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(235,235,235,0.45)';
        ctx.lineWidth = Math.max(1, r * 0.18);
        ctx.beginPath();
        ctx.arc(x, y, r, -0.3, Math.PI * 0.9);
        ctx.stroke();
      }
      // Grit and pebbles, each with a light top-left and a shadow bottom-right.
      for (let i = 0; i < 9000; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = rand() < 0.96 ? 0.5 + rand() * 1.1 : 1.6 + rand() * 2.6;
        const v = 120 + Math.floor(rand() * 120);
        if (r > 1.5) {
          ctx.fillStyle = 'rgba(40,40,40,0.5)';
          ctx.beginPath();
          ctx.arc(x + r * 0.5, y + r * 0.5, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    false,
  );
}

/** Solar cells: dark blue cells with thin silver lines. */
export function getCellTexture(): CanvasTexture {
  return draw('cells', 256, (ctx, size) => {
    ctx.fillStyle = '#c8ccd4';
    ctx.fillRect(0, 0, size, size);
    const cell = size / 8;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const shade = 18 + ((x * 7 + y * 13) % 9);
        ctx.fillStyle = `rgb(${shade * 0.5},${shade * 0.8},${shade * 2.4})`;
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
    }
  });
}

/** Spacesuit fabric: quilted panels with stitched seams and a soft weave. Greyscale (map and bump). */
export function getSuitTexture(): CanvasTexture {
  return draw('suit', 256, (ctx, size) => {
    const rand = painter(17);
    ctx.fillStyle = '#f0efea';
    ctx.fillRect(0, 0, size, size);
    // Weave: fine cross-hatching.
    for (let i = 0; i < size; i += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.025 + rand() * 0.03})`;
      ctx.fillRect(i, 0, 1, size);
      ctx.fillRect(0, i, size, 1);
    }
    // Quilted panels: each one shaded a little, with a darker seam and stitch dots.
    const step = 64;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const g = ctx.createRadialGradient(x + step / 2, y + step / 2, 4, x + step / 2, y + step / 2, step * 0.7);
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(120,118,112,0.28)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, step, step);
      }
    }
    ctx.strokeStyle = 'rgba(90,88,84,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70,68,64,0.55)';
    for (let i = 0; i <= size; i += step) {
      for (let k = 4; k < size; k += 8) {
        ctx.fillRect(i + 4, k, 1.5, 3);
        ctx.fillRect(k, i + 4, 3, 1.5);
      }
    }
  });
}
