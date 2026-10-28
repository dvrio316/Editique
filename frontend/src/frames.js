// Frame definitions, layout maths, and "bring your own frame" helpers.
export const CARD_W = 400;

// Built-in frames are drawn in code. "Customize" starts as a pink classic you can recolor.
export const BUILTIN = [
  { id: 'classic', name: 'Classic', count: 3, color: '#ffffff', holes: false, caption: 'Editique', captionColor: '#151515' },
  { id: 'film', name: 'Film', count: 4, color: '#1a1410', holes: true, holeColor: '#ffffff' },
  { id: 'maroon', name: 'Maroon', count: 3, color: '#7a0f1f', holes: false, caption: 'Editique', captionColor: '#fdf3e9' },
  { id: 'redfilm', name: 'Red film', count: 4, color: '#b4401a', holes: true, holeColor: '#fff3e0' },
  { id: 'custom', name: 'Customize', count: 3, color: '#ffd6e0', holes: false, caption: 'Editique', captionColor: '#151515', custom: true },
];

// card size + photo slots (card units, card is always 400 wide)
export function layout(f) {
  if (f.image) return { w: CARD_W, h: f.h, slots: f.slots };
  const n = f.count;
  if (f.holes) {
    const sh = 225, gap = 15, top = 30;
    return {
      w: CARD_W,
      h: top * 2 + n * sh + (n - 1) * gap,
      slots: Array.from({ length: n }, (_, i) => ({ x: 50, y: top + i * (sh + gap), w: 300, h: sh })),
    };
  }
  const sh = 300, gap = 20, top = 40, cap = 140;
  return {
    w: CARD_W,
    h: top + n * sh + (n - 1) * gap + cap,
    slots: Array.from({ length: n }, (_, i) => ({ x: 40, y: top + i * (sh + gap), w: 320, h: sh })),
  };
}

export const loadImage = (src) =>
  new Promise((resolve) => {
    const im = new window.Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });

// Guess where the photo windows are in an uploaded frame picture: big light areas that are
// enclosed by the frame (not the background touching the picture's edge). Result is only a
// starting point, the sliders in the app fine-tune it.
export function detectWindows(img) {
  const W = CARD_W;
  const H = Math.round((img.height * W) / img.width);
  const fallback = { h: H, count: 3, left: 40, top: 40, width: 320, height: Math.round((H - 120) / 3), gap: 20 };
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const light = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) light[i] = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 222 ? 1 : 0;

  // remove light areas connected to the picture edge (the background around the frame)
  const seen = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const k = y * W + x;
    if (light[k] && !seen[k]) {
      seen[k] = 1;
      stack.push(k);
    }
  };
  for (let x = 0; x < W; x++) (push(x, 0), push(x, H - 1));
  for (let y = 0; y < H; y++) (push(0, y), push(W - 1, y));
  while (stack.length) {
    const k = stack.pop();
    const x = k % W;
    const y = (k - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }
  for (let k = 0; k < W * H; k++) if (seen[k]) light[k] = 0;

  // columns that are light for much of the height -> window x-range
  const cols = new Uint16Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cols[x] += light[y * W + x];
  const maxC = Math.max(...cols);
  if (maxC < H * 0.1) return fallback;
  let x0 = -1;
  let x1 = -1;
  for (let x = 0; x < W; x++) if (cols[x] > 0.5 * maxC) (x0 < 0 && (x0 = x), (x1 = x));

  // rows that are mostly light inside that range -> one segment per window
  const segs = [];
  let s = -1;
  for (let y = 0; y <= H; y++) {
    let on = false;
    if (y < H) {
      let n = 0;
      for (let x = x0; x <= x1; x++) n += light[y * W + x];
      on = n / (x1 - x0 + 1) >= 0.6;
    }
    if (on && s < 0) s = y;
    if (!on && s >= 0) {
      if (y - s > H * 0.05) segs.push([s, y]);
      s = -1;
    }
  }
  if (!segs.length) return fallback;

  // tighten the x-range using only the window rows
  const inWin = (y) => segs.some(([a, b]) => y >= a && y < b);
  const rows = [];
  for (let y = 0; y < H; y++) if (inWin(y)) rows.push(y);
  let nx0 = -1;
  let nx1 = -1;
  for (let x = x0; x <= x1; x++) {
    let n = 0;
    for (const y of rows) n += light[y * W + x];
    if (n / rows.length >= 0.6) (nx0 < 0 && (nx0 = x), (nx1 = x));
  }
  if (nx0 >= 0) [x0, x1] = [nx0, nx1];

  const hs = segs.map(([a, b]) => b - a).sort((a, b) => a - b);
  const height = hs[Math.floor(hs.length / 2)];
  const n = Math.min(6, segs.length);
  const gap = n > 1 ? Math.max(0, Math.round((segs[n - 1][0] - segs[0][0]) / (n - 1) - height)) : 0;
  return { h: H, count: n, left: x0, top: segs[0][0], width: x1 - x0 + 1, height, gap };
}

// make the photo windows see-through and return a frame definition
export function buildFrame(img, p, name) {
  const S = 2; // store at 2x for sharp exports
  const c = document.createElement('canvas');
  c.width = CARD_W * S;
  c.height = p.h * S;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const slots = Array.from({ length: p.count }, (_, i) => ({ x: p.left, y: p.top + i * (p.height + p.gap), w: p.width, h: p.height }));
  for (const r of slots) ctx.clearRect(r.x * S - 2, r.y * S - 2, r.w * S + 4, r.h * S + 4);
  return { id: 'up' + Date.now(), name, image: c.toDataURL('image/png'), h: p.h, slots, count: slots.length, color: '#ffffff', upload: true };
}
