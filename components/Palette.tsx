"use client";

import {
  Server,
  Scale,
  Database,
  HardDrive,
  Zap,
  Waypoints,
  Boxes,
  Globe,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { PALETTE } from "@/lib/infrastructureData";

const ICONS: Record<string, LucideIcon> = {
  Server,
  Scale,
  Database,
  HardDrive,
  Zap,
  Waypoints,
  Boxes,
  Globe,
  Inbox,
};

export default function Palette() {
  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full w-60 flex-col gap-2 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Components
      </h2>
      {PALETTE.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            title={item.hint}
            className="group flex cursor-grab items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-400 hover:shadow active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800"
          >
            <Icon size={20} className="mt-0.5 shrink-0 text-sky-500" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="truncate text-[11px] text-slate-500">{item.hint}</div>
            </div>
          </div>
        );
      })}
      <p className="mt-auto px-1 text-[11px] leading-relaxed text-slate-400">
        Drag a component onto the canvas. Connect a Load Balancer to servers, and
        servers to databases, storage or cache.
      </p>
    </div>
  );
}
