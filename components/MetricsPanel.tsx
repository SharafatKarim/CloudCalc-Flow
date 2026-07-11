"use client";

import { useMemo, useRef } from "react";
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  ClipboardCopy,
  Trash2,
  Cpu,
  Timer,
  Activity,
  Network,
} from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import { useToastStore } from "@/store/toastStore";
import { useGlobalMetrics } from "@/hooks/useSimulation";
import {
  computeServerMetrics,
  getTrafficServers,
  type ServerMetrics,
} from "@/lib/simulation";
import type { ServerData } from "@/lib/types";
import { buildExport, downloadJSON, parseImport, toMarkdown } from "@/lib/export";
import { usd, healthDot, healthLabel, healthTextColor } from "@/lib/ui";
import SuggestionCard from "./SuggestionCard";

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function MetricsPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const setUsers = useArchitectureStore((s) => s.setConcurrentUsers);
  const snapshot = useArchitectureStore((s) => s.snapshot);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const clearAll = useArchitectureStore((s) => s.clearAll);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const canUndo = useArchitectureStore((s) => s.history.length > 0);
  const canRedo = useArchitectureStore((s) => s.redoStack.length > 0);
  const push = useToastStore((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);

  const g = useGlobalMetrics();

  // Servers that are not healthy, with live metrics (for the suggestion cards).
  const critical = useMemo(() => {
    const traffic = getTrafficServers(nodes, edges);
    const count = Math.max(1, traffic.size);
    return nodes
      .filter((n) => n.type === "server")
      .map((n) => ({
        id: n.id,
        data: n.data as ServerData,
        m: computeServerMetrics(n.data as ServerData, users, count, traffic.has(n.id)),
      }))
      .filter((x) => x.m.status !== "healthy");
  }, [nodes, edges, users]);

  const overloaded = critical.filter((c) => c.m.status === "overloaded");

  const handleExport = () => {
    downloadJSON(buildExport(nodes, edges, users));
    push("Architecture exported to JSON", "info");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      replaceArchitecture(parseImport(text));
      push("Architecture imported", "info");
    } catch (err) {
      push(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(nodes, edges, users));
      push("Architecture summary copied", "info");
    } catch {
      push("Clipboard not available", "error");
    }
  };

  const handleClear = () => {
    if (nodes.length === 0) return;
    if (window.confirm("Remove all nodes and connections?")) clearAll();
  };

  const btn =
    "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      {/* Simulated users */}
      <section>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Simulated Concurrent Users
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={10000}
            step={50}
            value={users}
            onPointerDown={snapshot}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="flex-1 accent-sky-500"
          />
          <input
            type="number"
            min={0}
            max={10000}
            value={users}
            onFocus={snapshot}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </section>

      {/* Total cost */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-800">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Total Monthly Cost
        </div>
        <div className="mt-1 text-3xl font-bold text-sky-600 dark:text-sky-400">
          ${g.totalCost.toFixed(2)}
        </div>
      </section>

      {/* Global status */}
      <section className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-xs text-slate-400">System Status</span>
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${healthTextColor(g.status)}`}>
          {healthDot(g.status)} {healthLabel(g.status)}
        </span>
      </section>

      {/* Warning banner */}
      {g.status !== "healthy" && (
        <div
          className={`rounded-lg px-3 py-2 text-xs font-medium ${
            g.status === "overloaded"
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {g.status === "overloaded"
            ? `${overloaded.length} server${overloaded.length === 1 ? "" : "s"} overloaded — reduce load or scale up.`
            : "Some servers are nearing capacity."}
        </div>
      )}

      {/* Key metrics */}
      <section className="grid grid-cols-2 gap-2">
        <Metric icon={<Cpu size={12} />} label="Total RAM" value={`${(g.totalRAM / 1024).toFixed(1)} GB`} />
        <Metric icon={<Timer size={12} />} label="Avg Response" value={`${g.avgResponseTime.toFixed(0)} ms`} />
        <Metric icon={<Activity size={12} />} label="Peak Throughput" value={`${g.peakThroughput.toFixed(0)} req/s`} />
        <Metric icon={<Network size={12} />} label="Bandwidth" value={`${g.bandwidthGBmo.toLocaleString()} GB/mo`} />
      </section>

      {/* Suggestions for overloaded servers */}
      {overloaded.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Suggestions
          </h3>
          {overloaded.map((c) => (
            <SuggestionCard key={c.id} id={c.id} data={c.data} />
          ))}
        </section>
      )}

      {/* Actions */}
      <section className="mt-auto grid grid-cols-2 gap-2">
        <button className={btn} onClick={undo} disabled={!canUndo}>
          <Undo2 size={14} /> Undo
        </button>
        <button className={btn} onClick={redo} disabled={!canRedo}>
          <Redo2 size={14} /> Redo
        </button>
        <button className={btn} onClick={handleExport}>
          <Download size={14} /> Export
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Import
        </button>
        <button className={btn} onClick={handleCopy}>
          <ClipboardCopy size={14} /> Copy Text
        </button>
        <button
          className={`${btn} text-red-500 hover:border-red-400`}
          onClick={handleClear}
        >
          <Trash2 size={14} /> Clear All
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </section>
    </div>
  );
}
