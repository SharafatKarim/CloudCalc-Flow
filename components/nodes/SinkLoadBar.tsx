"use client";

import { useSinkLoad } from "@/hooks/useSimulation";
import { utilBarColor } from "@/lib/ui";

/** Thin "busy-ness" bar for data / cache / storage / edge / queue sink nodes. */
export default function SinkLoadBar({ id }: { id: string }) {
  const load = useSinkLoad(id);
  if (!load) return null;
  return (
    <div className="px-3 pb-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full ${utilBarColor(load.loadPct)} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, load.loadPct)}%` }}
        />
      </div>
      <div className="mt-0.5 text-[9px] text-slate-400">{load.loadPct.toFixed(0)}% load</div>
    </div>
  );
}
