"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Server, Settings } from "lucide-react";
import { useServerMetrics } from "@/hooks/useSimulation";
import { useArchitectureStore } from "@/store/architectureStore";
import type { ServerData } from "@/lib/types";
import { utilBarColor, healthLabel, healthTextColor } from "@/lib/ui";

export default function ServerNode({ id, data, selected }: NodeProps) {
  const d = data as ServerData;
  const m = useServerMetrics(id);
  const openConfig = useArchitectureStore((s) => s.openConfig);
  const util = m?.utilPct ?? 0;
  const oom = util >= 100;

  return (
    <div
      onClick={() => openConfig(id)}
      className={`group relative w-48 cursor-pointer rounded-xl border-2 bg-white shadow-md transition dark:bg-slate-800 ${
        oom
          ? "border-red-500 ccf-critical"
          : selected
            ? "border-sky-500"
            : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-sky-500" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-sky-500" />

      <div className="flex items-center gap-2 px-3 pt-2">
        <Server size={16} className="shrink-0 text-sky-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
        <Settings size={14} className="text-slate-400" />
      </div>

      <div className="flex flex-wrap gap-1 px-3 py-1.5">
        {[d.tier, d.os, d.stack].map((p) => (
          <span
            key={p}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="px-3 pb-2">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full ${utilBarColor(util)} transition-all`}
            style={{ width: `${Math.min(100, util)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px]">
          <span className="text-slate-500">{util.toFixed(0)}% RAM</span>
          {m && <span className={healthTextColor(m.status)}>{healthLabel(m.status)}</span>}
        </div>
      </div>

      {m && (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-[10px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <div>
            RAM: {m.usedRAM.toFixed(0)} / {m.totalRAM} MB
          </div>
          <div>Response: {m.responseTimeMs.toFixed(0)} ms</div>
          <div>Throughput: {m.throughput.toFixed(0)} req/s</div>
          <div>Status: {healthLabel(m.status)}</div>
        </div>
      )}
    </div>
  );
}
