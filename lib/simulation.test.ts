import { describe, it, expect } from 'vitest';
import {
  computeServerMetrics,
  statusOf,
  getTrafficServers,
  computeGlobals,
  nodeCost,
  suggestFixes,
} from './simulation';
import { SERVER_TIERS } from './infrastructureData';
import type { AppNode, ServerData } from './types';

const server = (id: string, data: Partial<ServerData> = {}): AppNode => ({
  id,
  type: 'server',
  position: { x: 0, y: 0 },
  data: { kind: 'server', name: id, tier: 'Micro', os: 'Ubuntu', stack: 'Next.js', ...data },
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
    const m = computeServerMetrics(serverData(), 0, 1, true);
    expect(m.baseRAM).toBe(520);
    expect(m.trafficRAM).toBe(0);
    expect(m.utilPct).toBeCloseTo((520 / 1024) * 100, 5);
    expect(m.status).toBe('healthy');
  });

  it('adds traffic RAM proportional to users / stack footprint', () => {
    // 200 users, 1 server: trafficRAM = (200/1)/100 * 150 = 300
    const m = computeServerMetrics(serverData(), 200, 1, true);
    expect(m.trafficRAM).toBeCloseTo(300, 5);
    expect(m.usedRAM).toBeCloseTo(820, 5);
  });

  it('splits load across connected servers', () => {
    const m = computeServerMetrics(serverData(), 200, 2, true);
    expect(m.trafficRAM).toBeCloseTo(150, 5); // 100 users each
  });

  it('non-traffic server carries only base RAM', () => {
    const m = computeServerMetrics(serverData(), 10000, 3, false);
    expect(m.trafficRAM).toBe(0);
  });

  it('goes OOM under heavy load and degrades throughput', () => {
    const m = computeServerMetrics(serverData(), 1000, 1, true);
    expect(m.utilPct).toBeGreaterThanOrEqual(100);
    expect(m.status).toBe('overloaded');
    expect(m.throughput).toBeLessThan(SERVER_TIERS.Micro.maxThroughput);
    expect(m.throughput).toBeGreaterThanOrEqual(0);
  });

  it('response time rises with utilisation', () => {
    const idle = computeServerMetrics(serverData(), 0, 1, true);
    const busy = computeServerMetrics(serverData(), 300, 1, true);
    expect(busy.responseTimeMs).toBeGreaterThan(idle.responseTimeMs);
    expect(idle.responseTimeMs).toBeGreaterThanOrEqual(SERVER_TIERS.Micro.respBaselineMs);
  });
});

describe('getTrafficServers', () => {
  it('all servers receive traffic when no load balancer', () => {
    const nodes = [server('a'), server('b')];
    expect(getTrafficServers(nodes, []).size).toBe(2);
  });

  it('only LB-wired servers receive traffic when a LB exists', () => {
    const lb: AppNode = { id: 'lb', type: 'loadBalancer', position: { x: 0, y: 0 }, data: { kind: 'loadBalancer', name: 'LB' } };
    const nodes = [lb, server('a'), server('b')];
    const edges = [{ id: 'e1', source: 'lb', target: 'a' }];
    const t = getTrafficServers(nodes, edges);
    expect(t.has('a')).toBe(true);
    expect(t.has('b')).toBe(false);
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
    const s = suggestFixes(serverData(), 1000, 1);
    expect(s).toHaveLength(3);
    expect(s[0].title).toContain('Upgrade to Small');
    expect(s[0].deltaCost).toBe(SERVER_TIERS.Small.cost - SERVER_TIERS.Micro.cost);
    expect(s[1].title).toContain('Add another');
  });
});
