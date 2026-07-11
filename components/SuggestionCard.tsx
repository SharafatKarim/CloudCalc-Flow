"use client";

import { AlertTriangle, ArrowUpCircle, PlusCircle, Users } from "lucide-react";
import type { ServerData } from "@/lib/types";
import { suggestFixes, type Suggestion } from "@/lib/simulation";
import { useArchitectureStore } from "@/store/architectureStore";
import { useConnectedServerCount, useServerMetrics, useVarianceOpts } from "@/hooks/useSimulation";
import { nodeSeed } from "@/lib/variance";
import { usd } from "@/lib/ui";

function icon(kind: Suggestion["kind"]) {
  if (kind === "upgrade") return <ArrowUpCircle size={15} className="text-sky-500" />;
  if (kind === "add") return <PlusCircle size={15} className="text-emerald-500" />;
  return <Users size={15} className="text-amber-500" />;
}

export default function SuggestionCard({ id, data }: { id: string; data: ServerData }) {
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const connected = useConnectedServerCount();
  const opts = useVarianceOpts();
  const metrics = useServerMetrics(id);
  const node = useArchitectureStore((s) => s.nodes.find((n) => n.id === id));
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig);
  const addNode = useArchitectureStore((s) => s.addNode);
  const setUsers = useArchitectureStore((s) => s.setConcurrentUsers);
  const snapshot = useArchitectureStore((s) => s.snapshot);

  const share = metrics?.usersHandled ?? users / connected;
  const seed = node ? nodeSeed(node) : 0;
  const fixes = suggestFixes(data, seed, share, users, connected, opts);

  const apply = (f: Suggestion) => {
    if (f.kind === "upgrade" && f.tier) {
      updateNodeConfig(id, { tier: f.tier });
    } else if (f.kind === "add") {
      addNode("server", { x: 120, y: 120 });
    } else if (f.kind === "reduce" && typeof f.users === "number") {
      snapshot();
      setUsers(f.users);
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/40">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
        <AlertTriangle size={15} />
        {data.name} is overloaded
      </div>
      <div className="flex flex-col gap-1.5">
        {fixes.map((f) => (
          <button
            key={f.kind}
            onClick={() => apply(f)}
            className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2 text-left text-xs transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="mt-0.5">{icon(f.kind)}</span>
            <span className="flex-1">
              <span className="font-medium">{f.title}</span>
              <span className="block text-[11px] text-slate-500">{f.detail}</span>
            </span>
            <span
              className={`shrink-0 font-medium ${
                f.deltaCost > 0 ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {f.deltaCost > 0 ? `+${usd(f.deltaCost)}` : f.deltaCost < 0 ? usd(f.deltaCost) : "$0"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
