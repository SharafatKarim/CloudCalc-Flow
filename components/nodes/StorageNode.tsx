"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HardDrive } from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import type { StorageData } from "@/lib/types";
import { STORAGE_BASE_COST, STORAGE_PER_GB } from "@/lib/infrastructureData";
import { usd } from "@/lib/ui";
import SinkLoadBar from "./SinkLoadBar";

export default function StorageNode({ id, data, selected }: NodeProps) {
  const d = data as StorageData;
  const openConfig = useArchitectureStore((s) => s.openConfig);
  const cost = STORAGE_BASE_COST + d.sizeGB * STORAGE_PER_GB;

  return (
    <div
      onClick={() => openConfig(id)}
      className={`relative w-44 cursor-pointer rounded-xl border-2 bg-white shadow-md transition dark:bg-slate-800 ${
        selected ? "border-amber-500" : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-amber-500" />
      <div className="flex items-center gap-2 px-3 pt-2">
        <HardDrive size={16} className="shrink-0 text-amber-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
      </div>
      <div className="px-3 pb-2 pt-1 text-[11px] text-slate-500">
        <div>{d.sizeGB} GB</div>
        <div className="text-slate-400">{usd(cost)}/mo</div>
      </div>
      <SinkLoadBar id={id} />
    </div>
  );
}
