"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Waypoints } from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import type { ApiGatewayData } from "@/lib/types";
import { API_GATEWAY_COST } from "@/lib/infrastructureData";
import { usd } from "@/lib/ui";

export default function ApiGatewayNode({ id, data, selected }: NodeProps) {
  const d = data as ApiGatewayData;
  const edges = useArchitectureStore((s) => s.edges);
  const connectedServers = edges.filter((e) => e.source === id).length;

  return (
    <div
      className={`relative w-44 rounded-xl border-2 bg-white shadow-md dark:bg-slate-800 ${
        selected ? "border-violet-500" : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-violet-500" />
      <div className="flex items-center gap-2 px-3 pt-2">
        <Waypoints size={16} className="shrink-0 text-violet-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
      </div>
      <div className="px-3 pb-2 pt-1 text-[11px] text-slate-500">
        <div>Routes to {connectedServers} server{connectedServers === 1 ? "" : "s"}</div>
        <div className="text-slate-400">{usd(API_GATEWAY_COST)}/mo</div>
      </div>
    </div>
  );
}
