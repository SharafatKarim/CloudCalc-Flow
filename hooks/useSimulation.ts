import { useMemo } from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import {
  computeGlobals,
  computeServerMetrics,
  getTrafficServers,
  type GlobalMetrics,
  type ServerMetrics,
} from '@/lib/simulation';
import type { ServerData } from '@/lib/types';

/** Whole-architecture metrics, recomputed when nodes / edges / users change. */
export function useGlobalMetrics(): GlobalMetrics {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  return useMemo(() => computeGlobals(nodes, edges, users), [nodes, edges, users]);
}

/** Live metrics for a single Compute Server node (null for other node types). */
export function useServerMetrics(id: string): ServerMetrics | null {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  return useMemo(() => {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.type !== 'server') return null;
    const traffic = getTrafficServers(nodes, edges);
    return computeServerMetrics(
      node.data as ServerData,
      users,
      Math.max(1, traffic.size),
      traffic.has(id),
    );
  }, [nodes, edges, users, id]);
}

/** Number of Compute Servers currently in the traffic path (>=1 for math safety). */
export function useConnectedServerCount(): number {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  return useMemo(() => Math.max(1, getTrafficServers(nodes, edges).size), [nodes, edges]);
}
