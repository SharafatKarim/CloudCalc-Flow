"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Scale } from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import type { LoadBalancerData } from "@/lib/types";
import { LB_CAPACITY, LB_COST } from "@/lib/infrastructureData";
import { usd } from "@/lib/ui";

export default function LoadBalancerNode({ id, data, selected }: NodeProps) {
  const d = data as LoadBalancerData;
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);

  const connectedServers = edges.filter((e) => e.source === id).length;
  const overCapacity = users > LB_CAPACITY;

  return (
    <div
      className={`relative w-48 rounded-xl border-2 bg-white shadow-md dark:bg-slate-800 ${
        overCapacity ? "border-amber-500" : selected ? "border-indigo-500" : "border-slate-200 dark:border-slate-600"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-indigo-500" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-indigo-500" />

      <div className="flex items-center gap-2 px-3 pt-2">
        <Scale size={16} className="shrink-0 text-indigo-500" />
        <span className="flex-1 truncate text-sm font-semibold">{d.name}</span>
      </div>
      <div className="px-3 pb-2 pt-1 text-[11px] text-slate-500">
        <div className={overCapacity ? "text-amber-500" : ""}>
          {users.toLocaleString()} / {LB_CAPACITY.toLocaleString()} conns
        </div>
        <div>Connected to {connectedServers} server{connectedServers === 1 ? "" : "s"}</div>
        <div className="text-slate-400">{usd(LB_COST)}/mo</div>
      </div>
    </div>
  );
}
