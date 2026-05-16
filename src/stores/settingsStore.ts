import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrencyMode, DashboardLayout, FontSizeMode } from '@/types/domain';

export type PaletteKey = 'warm' | 'deeper' | 'cool' | 'energetic' | 'earthy';

export const PALETTES: { key: PaletteKey; label: string; swatch: string[] }[] = [
  { key: 'warm', label: 'Warm (기본)', swatch: ['#E5765E', '#7FA274', '#6E94C0'] },
  { key: 'deeper', label: 'Deeper', swatch: ['#D45F45', '#5F8657', '#3e6593'] },
  { key: 'cool', label: 'Cool', swatch: ['#9B8AC2', '#7FA274', '#D4A656'] },
  { key: 'energetic', label: 'Energetic', swatch: ['#C25A5A', '#D4A656', '#6E94C0'] },
  { key: 'earthy', label: 'Earthy', swatch: ['#5F8657', '#E5765E', '#9B8AC2'] },
];

type State = {
  fontSize: number;
  fontSizeMode: FontSizeMode;
  hiContrast: boolean;
  currencyMode: CurrencyMode;
  dashboardLayout: DashboardLayout;
  palette: PaletteKey;
  setFontSize: (n: number) => void;
  setFontSizeMode: (mode: FontSizeMode) => void;
  toggleHiContrast: () => void;
  setCurrencyMode: (m: CurrencyMode) => void;
  setDashboardLayout: (l: DashboardLayout) => void;
  setPalette: (p: PaletteKey) => void;
};

const FONT_SIZE_PIXELS: Record<FontSizeMode, number> = {
  normal: 16,
  large: 18,
  xlarge: 20,
};

export const useSettings = create<State>()(
  persist(
    (set) => ({
      fontSize: 17,
      fontSizeMode: 'normal',
      hiContrast: false,
      currencyMode: 'won',
      dashboardLayout: 'card',
      palette: 'warm',
      setFontSize: (n) => set({ fontSize: n }),
      setFontSizeMode: (mode) => set({ fontSizeMode: mode, fontSize: FONT_SIZE_PIXELS[mode] }),
      toggleHiContrast: () => set((s) => ({ hiContrast: !s.hiContrast })),
      setCurrencyMode: (m) => set({ currencyMode: m }),
      setDashboardLayout: (l) => set({ dashboardLayout: l }),
      setPalette: (p) => set({ palette: p }),
    }),
    { name: 'gagyebu-settings' },
  ),
);

export function applySettingsEffects(
  fontSize: number,
  hiContrast: boolean,
  palette: PaletteKey,
) {
  document.documentElement.style.setProperty('--fs-base', `${fontSize}px`);
  document.body.classList.toggle('hi-contrast', hiContrast);
  if (palette === 'warm') {
    document.body.removeAttribute('data-palette');
  } else {
    document.body.setAttribute('data-palette', palette);
  }
}
