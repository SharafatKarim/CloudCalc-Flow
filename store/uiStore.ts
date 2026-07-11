import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

type UiStore = {
  theme: Theme;
  paletteOpen: boolean;
  metricsOpen: boolean;
  toggleTheme: () => void;
  setPaletteOpen: (v: boolean) => void;
  setMetricsOpen: (v: boolean) => void;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'light',
      paletteOpen: false,
      metricsOpen: false,
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setMetricsOpen: (v) => set({ metricsOpen: v }),
    }),
    {
      name: 'ccf-ui',
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
