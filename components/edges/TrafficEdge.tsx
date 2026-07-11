"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useArchitectureStore } from "@/store/architectureStore";
import { useGlobalMetrics } from "@/hooks/useSimulation";

export default function TrafficEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const deleteEdge = useArchitectureStore((s) => s.deleteEdge);
  const { bandwidthGBmo } = useGlobalMetrics();

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ strokeWidth: 2, stroke: selected ? "#0ea5e9" : "#94a3b8" }}
      />
      <EdgeLabelRenderer>
        <div
          className="group nodrag nopan absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <span className="pointer-events-none rounded bg-white/90 px-1 text-[9px] text-slate-500 opacity-0 shadow group-hover:opacity-100 dark:bg-slate-700/90 dark:text-slate-300">
            ~{bandwidthGBmo.toLocaleString()} GB/mo
          </span>
          <button
            onClick={() => deleteEdge(id)}
            title="Delete connection"
            className="h-5 w-5 rounded-full border border-slate-300 bg-white text-xs leading-none text-slate-500 opacity-0 shadow transition hover:text-red-500 group-hover:opacity-100 dark:border-slate-500 dark:bg-slate-700"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
