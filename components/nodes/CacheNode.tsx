"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { CacheData } from "@/lib/types";
import { CACHE_COST } from "@/lib/infrastructureData";
import { usd } from "@/lib/ui";

export default function CacheNode({ data, selected }: NodeProps) {
  const d = data as CacheData;

  return (
    <div
      className={`relative w-44 rounded-xl border-2 bg-white shadow-md dark:bg-slate-800 ${
        selected ? "border-rose-500" : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-rose-500" />
      <div className="flex items-center gap-2 px-3 pt-2">
        <Zap size={16} className="shrink-0 text-rose-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
      </div>
      <div className="px-3 pb-2 pt-1 text-[11px] text-slate-500">
        <div>In-memory cache</div>
        <div className="text-slate-400">{usd(CACHE_COST)}/mo</div>
      </div>
    </div>
  );
}
