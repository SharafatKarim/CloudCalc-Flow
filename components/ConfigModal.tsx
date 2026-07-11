"use client";

import { X, Trash2 } from "lucide-react";
import { useArchitectureStore } from "@/store/architectureStore";
import { useConnectedServerCount } from "@/hooks/useSimulation";
import {
  SERVER_TIERS,
  OS_LIST,
  STACK_LIST,
  DB_LIST,
  TIER_ORDER,
  DB_BASE_COST,
  DB_PER_GB,
  STORAGE_BASE_COST,
  STORAGE_PER_GB,
} from "@/lib/infrastructureData";
import { computeServerMetrics } from "@/lib/simulation";
import type { ServerData, DatabaseData, StorageData, Tier, OS, Stack, DbKind } from "@/lib/types";
import { usd, utilBarColor, healthLabel, healthTextColor } from "@/lib/ui";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800";

export default function ConfigModal() {
  const show = useArchitectureStore((s) => s.showConfigModal);
  const selectedId = useArchitectureStore((s) => s.selectedNodeId);
  const nodes = useArchitectureStore((s) => s.nodes);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const connected = useConnectedServerCount();
  const update = useArchitectureStore((s) => s.updateNodeConfig);
  const deleteNode = useArchitectureStore((s) => s.deleteNode);
  const close = useArchitectureStore((s) => s.closeConfig);

  const node = nodes.find((n) => n.id === selectedId);
  if (!show || !node) return null;

  const remove = () => deleteNode(node.id);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={close}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative z-10 flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Configure</h2>
          <button onClick={close} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        {node.type === "server" && (() => {
          const d = node.data as ServerData;
          const preview = computeServerMetrics(d, users, connected, true);
          return (
            <>
              <Field label="Server Name">
                <input
                  className={selectCls}
                  value={d.name}
                  onChange={(e) => update(node.id, { name: e.target.value })}
                />
              </Field>
              <Field label="Hardware Tier">
                <select
                  className={selectCls}
                  value={d.tier}
                  onChange={(e) => update(node.id, { tier: e.target.value as Tier })}
                >
                  {TIER_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {t} — {SERVER_TIERS[t].ramMB / 1024}GB RAM, {usd(SERVER_TIERS[t].cost)}/mo
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Operating System">
                <select
                  className={selectCls}
                  value={d.os}
                  onChange={(e) => update(node.id, { os: e.target.value as OS })}
                >
                  {OS_LIST.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tech Stack">
                <select
                  className={selectCls}
                  value={d.stack}
                  onChange={(e) => update(node.id, { stack: e.target.value as Stack })}
                >
                  {STACK_LIST.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-400">Preview @ {users.toLocaleString()} users</span>
                  <span className={healthTextColor(preview.status)}>{healthLabel(preview.status)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-full ${utilBarColor(preview.utilPct)}`} style={{ width: `${Math.min(100, preview.utilPct)}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                  <span>RAM: {preview.utilPct.toFixed(0)}%</span>
                  <span>Cost: {usd(SERVER_TIERS[d.tier].cost)}/mo</span>
                  <span>Resp: {preview.responseTimeMs.toFixed(0)} ms</span>
                  <span>Thru: {preview.throughput.toFixed(0)} req/s</span>
                </div>
              </div>
            </>
          );
        })()}

        {node.type === "database" && (() => {
          const d = node.data as DatabaseData;
          const cost = DB_BASE_COST[d.db] + Math.max(0, d.sizeGB - 1) * DB_PER_GB;
          return (
            <>
              <Field label="Database Type">
                <select
                  className={selectCls}
                  value={d.db}
                  onChange={(e) => update(node.id, { db: e.target.value as DbKind, name: e.target.value })}
                >
                  {DB_LIST.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label={`Storage Size: ${d.sizeGB} GB`}>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={d.sizeGB}
                  onChange={(e) => update(node.id, { sizeGB: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </Field>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                Cost: <span className="font-semibold">{usd(cost)}/mo</span>
              </div>
            </>
          );
        })()}

        {node.type === "storage" && (() => {
          const d = node.data as StorageData;
          const cost = STORAGE_BASE_COST + d.sizeGB * STORAGE_PER_GB;
          return (
            <>
              <Field label={`Storage Size: ${d.sizeGB} GB`}>
                <input
                  type="range"
                  min={1}
                  max={1000}
                  value={d.sizeGB}
                  onChange={(e) => update(node.id, { sizeGB: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </Field>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                Cost: <span className="font-semibold">{usd(cost)}/mo</span>{" "}
                <span className="text-xs text-slate-400">(${STORAGE_BASE_COST} base + $0.10/GB)</span>
              </div>
            </>
          );
        })()}

        {(node.type === "cache" || node.type === "loadBalancer") && (
          <p className="text-sm text-slate-500">
            This component has a fixed configuration and cost. No settings to adjust.
          </p>
        )}

        <button
          onClick={remove}
          className="mt-auto flex items-center justify-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          <Trash2 size={15} /> Delete this node
        </button>
      </div>
    </div>
  );
}
