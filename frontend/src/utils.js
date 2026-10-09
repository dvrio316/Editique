import { useCallback, useEffect, useState } from 'react';

// Polaroid card + photo area (document coordinates)
// Photo-strip card: three stacked photo slots + a caption area at the bottom
export const CARD_W = 400;
export const CARD_H = 1120;
export const PHOTOS = [
  { x: 40, y: 40, w: 320, h: 300 },
  { x: 40, y: 360, w: 320, h: 300 },
  { x: 40, y: 680, w: 320, h: 300 },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const FONTS = [
  'Caveat',
  'Patrick Hand',
  'Permanent Marker',
  'Shadows Into Light',
  'Pacifico',
  'Special Elite',
  'Arial',
  'Georgia',
];

// 10 sticker slots. Swap these for image URLs later if you want custom artwork.
export const STICKERS = ['⭐', '❤️', '🌈', '🎀', '😎', '🌸', '✨', '🍓', '👑', '🦋'];

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const PRESETS = [
  {
    name: 'Sunset',
    src: svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a8b"/><stop offset="0.6" stop-color="#ffd27f"/><stop offset="1" stop-color="#8ec5fc"/></linearGradient></defs><rect width="520" height="520" fill="url(#g)"/><circle cx="260" cy="330" r="90" fill="#fff3b0"/><rect y="400" width="520" height="120" fill="#5b7db1"/></svg>`
    ),
  },
  {
    name: 'Polka',
    src: svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520"><rect width="520" height="520" fill="#ffd6e0"/>${Array.from(
        { length: 36 },
        (_, i) =>
          `<circle cx="${(i % 6) * 100 + (Math.floor(i / 6) % 2) * 50 + 30}" cy="${Math.floor(i / 6) * 90 + 40}" r="22" fill="#ff8fab" opacity="0.7"/>`
      ).join('')}</svg>`
    ),
  },
  {
    name: 'Sky',
    src: svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6dd5ed"/><stop offset="1" stop-color="#e0f7ff"/></linearGradient></defs><rect width="520" height="520" fill="url(#s)"/><g fill="#fff"><ellipse cx="150" cy="170" rx="80" ry="34"/><ellipse cx="210" cy="150" rx="60" ry="34"/><ellipse cx="380" cy="300" rx="90" ry="38"/><ellipse cx="320" cy="280" rx="60" ry="32"/></g></svg>`
    ),
  },
];

export function useImage(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let alive = true;
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => alive && setImg(i);
    i.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}

/**
 * Undo/redo state. commit(fn, {key}) pushes a snapshot; consecutive commits with
 * the same key (e.g. typing in a text box) are merged into one undo step.
 */
export function useHistory(initial) {
  const [h, setH] = useState({ past: [], present: initial, future: [], key: null });

  const commit = useCallback((fn, opts = {}) => {
    setH((s) => {
      const merge = opts.key && opts.key === s.key;
      return {
        past: merge ? s.past : [...s.past, s.present].slice(-100),
        present: fn(s.present),
        future: [],
        key: opts.key || null,
      };
    });
  }, []);

  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length
          ? {
              past: s.past.slice(0, -1),
              present: s.past[s.past.length - 1],
              future: [s.present, ...s.future],
              key: null,
            }
          : s
      ),
    []
  );

  const redo = useCallback(
    () =>
      setH((s) =>
        s.future.length
          ? {
              past: [...s.past, s.present],
              present: s.future[0],
              future: s.future.slice(1),
              key: null,
            }
          : s
      ),
    []
  );

  return {
    doc: h.present,
    commit,
    undo,
    redo,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
