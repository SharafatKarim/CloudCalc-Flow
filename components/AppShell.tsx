"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import { useArchitectureStore } from "@/store/architectureStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Header from "./Header";
import Palette from "./Palette";
import Canvas from "./Canvas";
import MetricsPanel from "./MetricsPanel";
import ConfigModal from "./ConfigModal";
import Toaster from "./Toaster";

export default function AppShell() {
  const theme = useUiStore((s) => s.theme);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const metricsOpen = useUiStore((s) => s.metricsOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setMetricsOpen = useUiStore((s) => s.setMetricsOpen);

  const varianceLive = useArchitectureStore((s) => s.varianceLive);
  const tickVariance = useArchitectureStore((s) => s.tickVariance);

  useKeyboardShortcuts();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Live traffic: advance the variance seed on a tick so metrics fluctuate
  // over time (CSS width transitions smooth the motion into a "breathing" effect).
  useEffect(() => {
    if (!varianceLive) return;
    const id = setInterval(tickVariance, 1500);
    return () => clearInterval(id);
  }, [varianceLive, tickVariance]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="relative flex flex-1 overflow-hidden">
        {/* Palette — static on md+, drawer on mobile */}
        <div className="hidden md:block">
          <Palette />
        </div>
        {paletteOpen && (
          <div className="absolute inset-0 z-30 md:hidden" onClick={() => setPaletteOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 h-full" onClick={(e) => e.stopPropagation()}>
              <Palette />
            </div>
          </div>
        )}

        <main className="flex-1">
          <Canvas />
        </main>

        {/* Metrics — static on lg+, drawer on smaller screens */}
        <div className="hidden lg:block">
          <MetricsPanel />
        </div>
        {metricsOpen && (
          <div
            className="absolute inset-0 z-30 flex justify-end lg:hidden"
            onClick={() => setMetricsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 h-full" onClick={(e) => e.stopPropagation()}>
              <MetricsPanel />
            </div>
          </div>
        )}
      </div>

      <ConfigModal />
      <Toaster />
    </div>
  );
}
