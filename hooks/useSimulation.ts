import { useMemo } from 'react';
import { useArchitectureStore } from '@/store/architectureStore';
import {
  computeGlobals,
  computeServerMetrics,
  computeSinkLoad,
  computeTrafficShares,
  getTrafficServers,
  type GlobalMetrics,
  type ServerMetrics,
  type SinkLoad,
} from '@/lib/simulation';
import { nodeSeed, type VarianceOpts } from '@/lib/variance';
import type { ServerData } from '@/lib/types';

/** Current variance settings from the store. */
export function useVarianceOpts(): VarianceOpts {
  const enabled = useArchitectureStore((s) => s.varianceEnabled);
  const varianceSeed = useArchitectureStore((s) => s.varianceSeed);
  return useMemo(() => ({ enabled, varianceSeed }), [enabled, varianceSeed]);
}

/** Whole-architecture metrics, recomputed when nodes / edges / users / variance change. */
export function useGlobalMetrics(): GlobalMetrics {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const opts = useVarianceOpts();
  return useMemo(() => computeGlobals(nodes, edges, users, opts), [nodes, edges, users, opts]);
}

/** Live metrics for a single Compute Server node (null for other node types). */
export function useServerMetrics(id: string): ServerMetrics | null {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const opts = useVarianceOpts();
  return useMemo(() => {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.type !== 'server') return null;
    const shares = computeTrafficShares(nodes, edges, users, opts);
    return computeServerMetrics(node.data as ServerData, shares.get(id) ?? 0, opts, nodeSeed(node));
  }, [nodes, edges, users, opts, id]);
}

/** Busy-ness indicator for a data / cache / storage / edge / queue sink (null otherwise). */
export function useSinkLoad(id: string): SinkLoad | null {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const users = useArchitectureStore((s) => s.concurrentUsers);
  const opts = useVarianceOpts();
  return useMemo(() => {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.type === 'server' || node.type === 'loadBalancer' || node.type === 'apiGateway') {
      return null;
    }
    return computeSinkLoad(node, nodes, edges, users, opts);
  }, [nodes, edges, users, opts, id]);
}

/** Number of Compute Servers currently in the traffic path (>=1 for math safety). */
export function useConnectedServerCount(): number {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  return useMemo(() => Math.max(1, getTrafficServers(nodes, edges).size), [nodes, edges]);
}
