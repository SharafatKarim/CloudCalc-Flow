"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import type { DatabaseData } from "@/lib/types";
import { DB_BASE_COST, DB_PER_GB } from "@/lib/infrastructureData";
import { usd } from "@/lib/ui";
import SinkLoadBar from "./SinkLoadBar";

export default function DatabaseNode({ id, data, selected }: NodeProps) {
  const d = data as DatabaseData;
  const openConfig = useArchitectureStore((s) => s.openConfig);
  const cost = DB_BASE_COST[d.db] + Math.max(0, d.sizeGB - 1) * DB_PER_GB;

  return (
    <div
      onClick={() => openConfig(id)}
      className={`relative w-44 cursor-pointer rounded-xl border-2 bg-white shadow-md transition dark:bg-slate-800 ${
        selected ? "border-emerald-500" : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-emerald-500" />
      <div className="flex items-center gap-2 px-3 pt-2">
        <Database size={16} className="shrink-0 text-emerald-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.db}</span>
      </div>
      <div className="px-3 pb-2 pt-1 text-[11px] text-slate-500">
        <div>{d.sizeGB} GB</div>
        <div className="text-slate-400">{usd(cost)}/mo</div>
      </div>
      <SinkLoadBar id={id} />
    </div>
  );
}
