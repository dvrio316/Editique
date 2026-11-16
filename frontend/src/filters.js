import Konva from 'konva';

// Photo filters. `filters` + `attrs` run on the photos with Konva (works on every browser incl. iOS);
// `css` is only used for the little thumbnails in the picker.
const F = Konva.Filters;
export const FILTERS = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'mono', name: 'B&W', css: 'grayscale(1)', filters: [F.Grayscale] },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.4)', filters: [F.Grayscale, F.Contrast], attrs: { contrast: 35 } },
  { id: 'sepia', name: 'Sepia', css: 'sepia(1)', filters: [F.Sepia] },
  { id: 'retro', name: 'Retro', css: 'sepia(0.6) contrast(1.2)', filters: [F.Sepia, F.Contrast, F.Noise], attrs: { contrast: 20, noise: 0.12 } },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.8) contrast(1.15)', filters: [F.HSL, F.Contrast], attrs: { saturation: 0.7, contrast: 15 } },
  { id: 'pop', name: 'Pop', css: 'saturate(2.4) contrast(1.3)', filters: [F.HSL, F.Contrast], attrs: { saturation: 1.4, contrast: 25 } },
  { id: 'fade', name: 'Fade', css: 'contrast(0.8) brightness(1.1)', filters: [F.Contrast, F.Brighten], attrs: { contrast: -25, brightness: 0.1 } },
  { id: 'dream', name: 'Dream', css: 'brightness(1.15) contrast(0.9) saturate(1.2)', filters: [F.Brighten, F.Contrast, F.HSL], attrs: { brightness: 0.15, contrast: -12, saturation: 0.3 } },
];
export const getFilter = (id) => FILTERS.find((f) => f.id === id && f.filters) || null;
