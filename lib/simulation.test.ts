import { describe, it, expect } from 'vitest';
import {
  computeServerMetrics,
  computeTrafficShares,
  computeSinkLoad,
  statusOf,
  getTrafficServers,
  computeGlobals,
  nodeCost,
  suggestFixes,
  NO_VARIANCE,
} from './simulation';
import { SERVER_TIERS } from './infrastructureData';
import type { VarianceOpts } from './variance';
import type { AppNode, AppEdge, ServerData } from './types';

const ON = (varianceSeed = 42): VarianceOpts => ({ enabled: true, varianceSeed });

const server = (id: string, data: Partial<ServerData> = {}): AppNode => ({
  id,
  type: 'server',
  position: { x: 0, y: 0 },
  data: { kind: 'server', name: id, tier: 'Micro', os: 'Ubuntu', stack: 'Next.js', seed: 1, ...data },
});

const serverData = (o: Partial<ServerData> = {}): ServerData => ({
  kind: 'server',
  name: 's',
  tier: 'Micro',
  os: 'Ubuntu',
  stack: 'Next.js',
  ...o,
});

describe('statusOf', () => {
  it('buckets by threshold', () => {
    expect(statusOf(79.9)).toBe('healthy');
    expect(statusOf(80)).toBe('warning');
    expect(statusOf(99.9)).toBe('warning');
    expect(statusOf(100)).toBe('overloaded');
  });
});

describe('computeServerMetrics', () => {
  it('Micro/Ubuntu/Next.js base RAM with no traffic', () => {
    // base = 400 (Ubuntu) + 120 (Next idle) = 520 of 1024
    const m = computeServerMetrics(serverData(), 0, NO_VARIANCE, 1);
    expect(m.baseRAM).toBe(520);
    expect(m.trafficRAM).toBe(0);
    expect(m.utilPct).toBeCloseTo((520 / 1024) * 100, 5);
    expect(m.status).toBe('healthy');
  });

  it('adds traffic RAM proportional to assigned users', () => {
    // 200 users: trafficRAM = 200/100 * 150 = 300
    const m = computeServerMetrics(serverData(), 200, NO_VARIANCE, 1);
    expect(m.trafficRAM).toBeCloseTo(300, 5);
    expect(m.usedRAM).toBeCloseTo(820, 5);
    expect(m.usersHandled).toBe(200);
  });

  it('goes OOM under heavy load and degrades throughput', () => {
    const m = computeServerMetrics(serverData(), 1000, NO_VARIANCE, 1);
    expect(m.utilPct).toBeGreaterThanOrEqual(100);
    expect(m.status).toBe('overloaded');
    expect(m.throughput).toBeLessThan(SERVER_TIERS.Micro.maxThroughput);
    expect(m.throughput).toBeGreaterThanOrEqual(0);
  });

  it('response time rises with utilisation', () => {
    const idle = computeServerMetrics(serverData(), 0, NO_VARIANCE, 1);
    const busy = computeServerMetrics(serverData(), 300, NO_VARIANCE, 1);
    expect(busy.responseTimeMs).toBeGreaterThan(idle.responseTimeMs);
    expect(idle.responseTimeMs).toBeGreaterThanOrEqual(SERVER_TIERS.Micro.respBaselineMs);
  });

  it('usage jitter shifts RAM but never below the tier baseline for response time', () => {
    const plain = computeServerMetrics(serverData(), 300, NO_VARIANCE, 1);
    const jittered = computeServerMetrics(serverData(), 300, ON(), 12345);
    expect(jittered.trafficRAM).not.toBeCloseTo(plain.trafficRAM, 5);
    // within ±10% of the un-jittered footprint
    expect(jittered.trafficRAM).toBeGreaterThan(plain.trafficRAM * 0.9 - 0.01);
    expect(jittered.trafficRAM).toBeLessThan(plain.trafficRAM * 1.1 + 0.01);
    expect(jittered.responseTimeMs).toBeGreaterThanOrEqual(SERVER_TIERS.Micro.respBaselineMs);
  });
});

describe('computeTrafficShares', () => {
  it('splits equally when variance is off', () => {
    const nodes = [server('a'), server('b')];
    const shares = computeTrafficShares(nodes, [], 200, NO_VARIANCE);
    expect(shares.get('a')).toBeCloseTo(100, 5);
    expect(shares.get('b')).toBeCloseTo(100, 5);
  });

  it('is deterministic, sums to total, and stays within the weight band when on', () => {
    const nodes = [server('a', { seed: 11 }), server('b', { seed: 22 }), server('c', { seed: 33 })];
    const s1 = computeTrafficShares(nodes, [], 3000, ON(7));
    const s2 = computeTrafficShares(nodes, [], 3000, ON(7));
    // deterministic
    for (const id of ['a', 'b', 'c']) expect(s1.get(id)).toBeCloseTo(s2.get(id)!, 9);
    // sums to total
    const total = [...s1.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(3000, 4);
    // uneven: not all equal
    expect(s1.get('a')).not.toBeCloseTo(s1.get('b')!, 3);
    // each within [0.6,1.4]/Σw band → for 3 servers, fraction in (0.14, 0.44)
    for (const id of ['a', 'b', 'c']) {
      const frac = s1.get(id)! / 3000;
      expect(frac).toBeGreaterThan(0.1);
      expect(frac).toBeLessThan(0.5);
    }
  });

  it('changing the variance seed changes the distribution', () => {
    const nodes = [server('a', { seed: 11 }), server('b', { seed: 22 })];
    const s1 = computeTrafficShares(nodes, [], 1000, ON(1));
    const s2 = computeTrafficShares(nodes, [], 1000, ON(2));
    expect(s1.get('a')).not.toBeCloseTo(s2.get('a')!, 2);
  });

  it('only LB-wired servers share traffic when a load balancer exists', () => {
    const lb: AppNode = { id: 'lb', type: 'loadBalancer', position: { x: 0, y: 0 }, data: { kind: 'loadBalancer', name: 'LB', seed: 5 } };
    const nodes = [lb, server('a'), server('b')];
    const edges: AppEdge[] = [{ id: 'e1', source: 'lb', target: 'a' }];
    const shares = computeTrafficShares(nodes, edges, 500, NO_VARIANCE);
    expect(shares.get('a')).toBeCloseTo(500, 5);
    expect(shares.has('b')).toBe(false);
  });
});

describe('getTrafficServers', () => {
  it('all servers receive traffic when no load balancer', () => {
    const nodes = [server('a'), server('b')];
    expect(getTrafficServers(nodes, []).size).toBe(2);
  });
});

describe('computeSinkLoad', () => {
  it('is idle with no connected servers and busier with more traffic', () => {
    const db: AppNode = { id: 'db', type: 'database', position: { x: 0, y: 0 }, data: { kind: 'database', name: 'db', db: 'PostgreSQL', sizeGB: 1, seed: 9 } };
    const s = server('a');
    const idle = computeSinkLoad(db, [db, s], [], 2000, NO_VARIANCE);
    expect(idle.loadPct).toBe(0);

    const edges: AppEdge[] = [{ id: 'e', source: 'a', target: 'db' }];
    const busy = computeSinkLoad(db, [db, s], edges, 2000, NO_VARIANCE);
    expect(busy.incomingUsers).toBeCloseTo(2000, 5);
    expect(busy.loadPct).toBeGreaterThan(0);
  });
});

describe('nodeCost', () => {
  it('prices each node type', () => {
    expect(nodeCost(server('s', { tier: 'Large' }))).toBe(64);
    expect(
      nodeCost({ id: 'd', type: 'database', position: { x: 0, y: 0 }, data: { kind: 'database', name: 'db', db: 'PostgreSQL', sizeGB: 1 } }),
    ).toBe(10);
    expect(
      nodeCost({ id: 's3', type: 'storage', position: { x: 0, y: 0 }, data: { kind: 'storage', name: 's3', sizeGB: 10 } }),
    ).toBeCloseTo(6, 5); // 5 + 10*0.1
  });
});

describe('computeGlobals', () => {
  it('aggregates cost, RAM and worst status', () => {
    const nodes = [server('a', { tier: 'Small' }), server('b', { tier: 'Small' })];
    const g = computeGlobals(nodes, [], 100);
    expect(g.serverCount).toBe(2);
    expect(g.totalCost).toBe(32);
    expect(g.totalRAM).toBe(SERVER_TIERS.Small.ramMB * 2);
    expect(g.bandwidthGBmo).toBe(200);
  });
});

describe('suggestFixes', () => {
  it('offers upgrade, add-server and reduce-users options', () => {
    const s = suggestFixes(serverData(), 1, 1000, 1000, 1, NO_VARIANCE);
    expect(s).toHaveLength(3);
    expect(s[0].title).toContain('Upgrade to Small');
    expect(s[0].deltaCost).toBe(SERVER_TIERS.Small.cost - SERVER_TIERS.Micro.cost);
    expect(s[1].title).toContain('Add another');
    expect(s[2].kind).toBe('reduce');
  });
});
