import type {
  AppNode,
  AppEdge,
  ServerData,
  DatabaseData,
  StorageData,
  CdnData,
  NoSqlData,
  Health,
} from './types';
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
  CDN_BASE,
  CDN_PER_GB,
  API_GATEWAY_COST,
  QUEUE_COST,
  NOSQL_BASE,
  NOSQL_PER_GB,
} from './infrastructureData';
import {
  jitter,
  nodeSeed,
  SALT_WEIGHT,
  SALT_USAGE,
  SALT_RESP,
  SALT_SINK,
  type VarianceOpts,
} from './variance';

/** Variance disabled — exact, uniform behaviour (the original model). */
export const NO_VARIANCE: VarianceOpts = { enabled: false, varianceSeed: 0 };

/** Relative traffic weight of a server (1 when variance is off). */
export function serverWeight(seed: number, opts: VarianceOpts): number {
  return opts.enabled ? jitter(seed ^ opts.varianceSeed, SALT_WEIGHT, 0.6, 1.4) : 1;
}

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

/**
 * Distribute the user load across the servers in the traffic path.
 * With variance on, each server is weighted (0.6–1.4×) by its seed so the split
 * is uneven like a real load balancer; with variance off it is exactly equal.
 * Returns a map of serverId → assigned users (only traffic-path servers).
 */
export function computeTrafficShares(
  nodes: AppNode[],
  edges: AppEdge[],
  concurrentUsers: number,
  opts: VarianceOpts,
): Map<string, number> {
  const traffic = getTrafficServers(nodes, edges);
  const shares = new Map<string, number>();
  if (traffic.size === 0) return shares;

  const weighted = nodes
    .filter((n) => n.type === 'server' && traffic.has(n.id))
    .map((n) => ({ id: n.id, w: serverWeight(nodeSeed(n), opts) }));
  const sumW = weighted.reduce((a, s) => a + s.w, 0) || 1;
  for (const s of weighted) shares.set(s.id, (concurrentUsers * s.w) / sumW);
  return shares;
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
  usersHandled: number;
};

/**
 * Per-server metrics for an already-assigned user count.
 * @param usersOnThisServer users routed to this server (from computeTrafficShares)
 * @param seed the server's stable variance seed (from nodeSeed)
 */
export function computeServerMetrics(
  data: ServerData,
  usersOnThisServer: number,
  opts: VarianceOpts,
  seed: number,
): ServerMetrics {
  const tier = SERVER_TIERS[data.tier];
  const stack = TECH_STACKS[data.stack];

  const totalRAM = tier.ramMB;
  const baseRAM = OS_OVERHEAD[data.os] + stack.idleMB;

  // ±10% per-server usage jitter — real workloads aren't uniform per user.
  const usageFactor = opts.enabled ? jitter(seed ^ opts.varianceSeed, SALT_USAGE, 0.9, 1.1) : 1;
  const trafficRAM = (usersOnThisServer / 100) * stack.perHundredMB * usageFactor;

  const usedRAM = baseRAM + trafficRAM;
  const utilPct = (usedRAM / totalRAM) * 100;

  // Latency noise, clamped so it never drops below the tier baseline.
  const respJitter = opts.enabled ? jitter(seed ^ opts.varianceSeed, SALT_RESP, -8, 8) : 0;
  const responseTimeMs = Math.max(tier.respBaselineMs, tier.respBaselineMs + (utilPct / 100) * 50 + respJitter);
  const throughput = Math.max(0, tier.maxThroughput * (1 - utilPct / 150));

  return {
    totalRAM,
    baseRAM,
    trafficRAM,
    usedRAM,
    utilPct,
    responseTimeMs,
    throughput,
    status: statusOf(utilPct),
    usersHandled: usersOnThisServer,
  };
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
    case 'cdn': {
      const d = node.data as CdnData;
      return CDN_BASE + d.cachedGB * CDN_PER_GB;
    }
    case 'apiGateway':
      return API_GATEWAY_COST;
    case 'queue':
      return QUEUE_COST;
    case 'nosql': {
      const d = node.data as NoSqlData;
      return NOSQL_BASE[d.db] + Math.max(0, d.sizeGB - 1) * NOSQL_PER_GB;
    }
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
  opts: VarianceOpts = NO_VARIANCE,
): GlobalMetrics {
  const shares = computeTrafficShares(nodes, edges, concurrentUsers, opts);
  const servers = nodes.filter((n) => n.type === 'server');

  let totalRAM = 0;
  let sumThroughput = 0;
  let respSum = 0;
  let respWeight = 0;
  let worst: Health = 'healthy';

  for (const s of servers) {
    const assigned = shares.get(s.id) ?? 0;
    const m = computeServerMetrics(s.data as ServerData, assigned, opts, nodeSeed(s));
    totalRAM += m.totalRAM;
    sumThroughput += m.throughput;
    if (shares.has(s.id)) {
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

export type SinkLoad = { loadPct: number; incomingUsers: number; status: Health };

/** Nominal user throughput a single data/cache/edge sink is "busy" at (display scale). */
const SINK_REF_USERS = 3000;

/**
 * Busy-ness of a data / cache / storage / edge / queue node — driven by the
 * assigned traffic of the servers wired into it, plus a per-node jitter. This
 * is a display-only indicator; it does not change any cost.
 */
export function computeSinkLoad(
  node: AppNode,
  nodes: AppNode[],
  edges: AppEdge[],
  concurrentUsers: number,
  opts: VarianceOpts = NO_VARIANCE,
): SinkLoad {
  const shares = computeTrafficShares(nodes, edges, concurrentUsers, opts);
  const serverIds = new Set(nodes.filter((n) => n.type === 'server').map((n) => n.id));

  let incoming = 0;
  for (const e of edges) {
    if (e.target === node.id && serverIds.has(e.source)) incoming += shares.get(e.source) ?? 0;
  }

  const j = opts.enabled ? jitter(nodeSeed(node) ^ opts.varianceSeed, SALT_SINK, 0.85, 1.15) : 1;
  const loadPct = Math.max(0, Math.min(100, (incoming / SINK_REF_USERS) * 100 * j));
  return { loadPct, incomingUsers: incoming, status: statusOf(loadPct) };
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
  seed: number,
  usersOnThisServer: number,
  totalUsers: number,
  connectedCount: number,
  opts: VarianceOpts = NO_VARIANCE,
): Suggestion[] {
  const out: Suggestion[] = [];
  const tier = SERVER_TIERS[data.tier];
  const idx = TIER_ORDER.indexOf(data.tier);

  if (idx < TIER_ORDER.length - 1) {
    const next = TIER_ORDER[idx + 1];
    const m = computeServerMetrics({ ...data, tier: next }, usersOnThisServer, opts, seed);
    out.push({
      kind: 'upgrade',
      title: `Upgrade to ${next}`,
      detail: `New utilization ~${m.utilPct.toFixed(0)}% (${m.status})`,
      deltaCost: SERVER_TIERS[next].cost - tier.cost,
      tier: next,
    });
  }

  // One more server widens the split; this server's share shrinks proportionally.
  const scaled = (usersOnThisServer * connectedCount) / (connectedCount + 1);
  const mAdd = computeServerMetrics(data, scaled, opts, seed);
  out.push({
    kind: 'add',
    title: 'Add another server',
    detail: `Widen the split → ~${mAdd.utilPct.toFixed(0)}% on this server`,
    deltaCost: tier.cost,
  });

  const stack = TECH_STACKS[data.stack];
  const baseRAM = OS_OVERHEAD[data.os] + stack.idleMB;
  const budgetRAM = 0.8 * tier.ramMB - baseRAM; // RAM available for traffic at the 80% line
  const usageFactor = opts.enabled ? jitter(seed ^ opts.varianceSeed, SALT_USAGE, 0.9, 1.1) : 1;
  const safeOnServer = Math.max(0, (budgetRAM * 100) / (stack.perHundredMB * usageFactor));
  // Scale this server's safe count back up to a total, honouring its traffic share.
  const frac = usersOnThisServer > 0 ? usersOnThisServer / Math.max(1, totalUsers) : 1 / Math.max(1, connectedCount);
  const safeUsers = Math.max(0, Math.floor(safeOnServer / Math.max(frac, 1e-6)));
  out.push({
    kind: 'reduce',
    title: `Reduce to ${safeUsers.toLocaleString()} users`,
    detail: 'Keeps this server under 80% utilization',
    deltaCost: 0,
    users: safeUsers,
  });

  return out;
}
