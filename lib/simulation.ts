import type { AppNode, AppEdge, ServerData, DatabaseData, StorageData, Health } from './types';
import {
  SERVER_TIERS,
  OS_OVERHEAD,
  TECH_STACKS,
  TIER_ORDER,
  DB_BASE_COST,
  DB_PER_GB,
  STORAGE_BASE_COST,
  STORAGE_PER_GB,
  CACHE_COST,
  LB_COST,
  LB_CAPACITY,
  BANDWIDTH_PER_USER_GB_MO,
} from './infrastructureData';

/**
 * Simulation math for CloudCalc Flow (instructions.md §4).
 * All functions are PURE — no store / DOM / Date dependencies — so they are
 * directly unit-testable.
 */

/** Map a RAM-utilisation percentage to a health bucket (spec thresholds). */
export function statusOf(utilPct: number): Health {
  if (utilPct >= 100) return 'overloaded';
  if (utilPct >= 80) return 'warning';
  return 'healthy';
}

const RANK: Record<Health, number> = { healthy: 0, warning: 1, overloaded: 2 };
/** Return the more severe of two health states. */
export function worseOf(a: Health, b: Health): Health {
  return RANK[b] > RANK[a] ? b : a;
}

/**
 * Set of server node ids that actually receive user traffic.
 * If any Load Balancer exists, only servers wired *from* a LB receive traffic;
 * otherwise every server receives traffic directly.
 */
export function getTrafficServers(nodes: AppNode[], edges: AppEdge[]): Set<string> {
  const servers = nodes.filter((n) => n.type === 'server');
  const lbs = nodes.filter((n) => n.type === 'loadBalancer');
  if (lbs.length === 0) return new Set(servers.map((s) => s.id));

  const lbIds = new Set(lbs.map((l) => l.id));
  const serverIds = new Set(servers.map((s) => s.id));
  const receiving = new Set<string>();
  for (const e of edges) {
    if (lbIds.has(e.source) && serverIds.has(e.target)) receiving.add(e.target);
  }
  return receiving;
}

export type ServerMetrics = {
  totalRAM: number;
  baseRAM: number;
  trafficRAM: number;
  usedRAM: number;
  utilPct: number;
  responseTimeMs: number;
  throughput: number;
  status: Health;
};

/**
 * Per-server metrics for a given user load.
 * @param connectedCount number of servers sharing the traffic (>=1)
 * @param receivesTraffic whether THIS server is in the traffic path
 */
export function computeServerMetrics(
  data: ServerData,
  concurrentUsers: number,
  connectedCount: number,
  receivesTraffic: boolean,
): ServerMetrics {
  const tier = SERVER_TIERS[data.tier];
  const stack = TECH_STACKS[data.stack];

  const totalRAM = tier.ramMB;
  const baseRAM = OS_OVERHEAD[data.os] + stack.idleMB;

  const usersOnThisServer = receivesTraffic
    ? concurrentUsers / Math.max(1, connectedCount)
    : 0;
  const trafficRAM = (usersOnThisServer / 100) * stack.perHundredMB;

  const usedRAM = baseRAM + trafficRAM;
  const utilPct = (usedRAM / totalRAM) * 100;
  const responseTimeMs = tier.respBaselineMs + (utilPct / 100) * 50;
  const throughput = Math.max(0, tier.maxThroughput * (1 - utilPct / 150));

  return { totalRAM, baseRAM, trafficRAM, usedRAM, utilPct, responseTimeMs, throughput, status: statusOf(utilPct) };
}

/** Monthly cost (USD) of a single node. */
export function nodeCost(node: AppNode): number {
  switch (node.type) {
    case 'server':
      return SERVER_TIERS[(node.data as ServerData).tier].cost;
    case 'loadBalancer':
      return LB_COST;
    case 'database': {
      const d = node.data as DatabaseData;
      return DB_BASE_COST[d.db] + Math.max(0, d.sizeGB - 1) * DB_PER_GB;
    }
    case 'storage': {
      const d = node.data as StorageData;
      return STORAGE_BASE_COST + d.sizeGB * STORAGE_PER_GB;
    }
    case 'cache':
      return CACHE_COST;
    default:
      return 0;
  }
}

export type GlobalMetrics = {
  totalCost: number;
  totalRAM: number;
  avgResponseTime: number;
  peakThroughput: number;
  bandwidthGBmo: number;
  status: Health;
  serverCount: number;
  dbCount: number;
};

/** Aggregate metrics across the whole architecture (spec §4 "Global Metrics"). */
export function computeGlobals(
  nodes: AppNode[],
  edges: AppEdge[],
  concurrentUsers: number,
): GlobalMetrics {
  const traffic = getTrafficServers(nodes, edges);
  const connectedCount = Math.max(1, traffic.size);
  const servers = nodes.filter((n) => n.type === 'server');

  let totalRAM = 0;
  let sumThroughput = 0;
  let respSum = 0;
  let respWeight = 0;
  let worst: Health = 'healthy';

  for (const s of servers) {
    const receives = traffic.has(s.id);
    const m = computeServerMetrics(s.data as ServerData, concurrentUsers, connectedCount, receives);
    totalRAM += m.totalRAM;
    sumThroughput += m.throughput;
    if (receives) {
      respSum += m.responseTimeMs;
      respWeight += 1;
    }
    worst = worseOf(worst, m.status);
  }

  const lbCount = nodes.filter((n) => n.type === 'loadBalancer').length;
  const cap = lbCount > 0 ? lbCount * LB_CAPACITY : Infinity;
  const peak = Math.min(sumThroughput, cap);

  return {
    totalCost: nodes.reduce((acc, n) => acc + nodeCost(n), 0),
    totalRAM,
    avgResponseTime: respWeight > 0 ? respSum / respWeight : 0,
    peakThroughput: Number.isFinite(peak) ? peak : sumThroughput,
    bandwidthGBmo: concurrentUsers * BANDWIDTH_PER_USER_GB_MO,
    status: worst,
    serverCount: servers.length,
    dbCount: nodes.filter((n) => n.type === 'database').length,
  };
}

export type Suggestion = {
  kind: 'upgrade' | 'add' | 'reduce';
  title: string;
  detail: string;
  deltaCost: number;
  /** Target tier for an 'upgrade' suggestion. */
  tier?: import('./types').Tier;
  /** Safe user count for a 'reduce' suggestion. */
  users?: number;
};

/**
 * Remediation options for an overloaded server (spec §5):
 * A) upgrade to next tier, B) add another server, C) reduce users to a safe level.
 */
export function suggestFixes(
  data: ServerData,
  concurrentUsers: number,
  connectedCount: number,
): Suggestion[] {
  const out: Suggestion[] = [];
  const tier = SERVER_TIERS[data.tier];
  const idx = TIER_ORDER.indexOf(data.tier);

  if (idx < TIER_ORDER.length - 1) {
    const next = TIER_ORDER[idx + 1];
    const m = computeServerMetrics({ ...data, tier: next }, concurrentUsers, connectedCount, true);
    out.push({
      kind: 'upgrade',
      title: `Upgrade to ${next}`,
      detail: `New utilization ~${m.utilPct.toFixed(0)}% (${m.status})`,
      deltaCost: SERVER_TIERS[next].cost - tier.cost,
      tier: next,
    });
  }

  const mAdd = computeServerMetrics(data, concurrentUsers, connectedCount + 1, true);
  out.push({
    kind: 'add',
    title: 'Add another server',
    detail: `Split load across ${connectedCount + 1} servers → ~${mAdd.utilPct.toFixed(0)}% each`,
    deltaCost: tier.cost,
  });

  const stack = TECH_STACKS[data.stack];
  const baseRAM = OS_OVERHEAD[data.os] + stack.idleMB;
  const budgetRAM = 0.8 * tier.ramMB - baseRAM; // RAM available for traffic at the 80% line
  const safeUsers = Math.max(
    0,
    Math.floor((budgetRAM * 100 * connectedCount) / stack.perHundredMB),
  );
  out.push({
    kind: 'reduce',
    title: `Reduce to ${safeUsers.toLocaleString()} users`,
    detail: 'Keeps this server under 80% utilization',
    deltaCost: 0,
    users: safeUsers,
  });

  return out;
}
