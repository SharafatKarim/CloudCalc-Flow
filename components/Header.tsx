"use client";

import { Cloud, Moon, Sun, PanelLeft, PanelRight } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useGlobalMetrics } from "@/hooks/useSimulation";

export default function Header() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setMetricsOpen = useUiStore((s) => s.setMetricsOpen);
  const { serverCount, dbCount } = useGlobalMetrics();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
      <button
        onClick={() => setPaletteOpen(true)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
        aria-label="Open components"
      >
        <PanelLeft size={18} />
      </button>

      <Cloud className="text-sky-500" size={22} />
      <div className="flex-1">
        <h1 className="text-base font-semibold leading-tight">CloudCalc Flow</h1>
        <p className="hidden text-[11px] text-slate-400 sm:block">
          Visual Cloud Architecture Simulator &amp; Cost Estimator
        </p>
      </div>

      <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-block dark:bg-slate-800 dark:text-slate-300">
        {serverCount} Server{serverCount === 1 ? "" : "s"} · {dbCount} Database
        {dbCount === 1 ? "" : "s"}
      </span>

      <button
        onClick={toggleTheme}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
        title="Toggle light/dark"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button
        onClick={() => setMetricsOpen(true)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
        aria-label="Open metrics"
      >
        <PanelRight size={18} />
      </button>
    </header>
  );
}
