import type { AppNode, AppEdge, ServerData, DatabaseData, StorageData, CdnData, NoSqlData } from './types';
import { nodeCost } from './simulation';

export type ExportPayload = {
  version: number;
  createdAt: string;
  concurrentUsers: number;
  totalCost: number;
  nodes: AppNode[];
  edges: AppEdge[];
};

/** Build the serialisable export object. `createdAt` is stamped here (not in pure sim code). */
export function buildExport(nodes: AppNode[], edges: AppEdge[], concurrentUsers: number): ExportPayload {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    concurrentUsers,
    totalCost: nodes.reduce((acc, n) => acc + nodeCost(n), 0),
    nodes,
    edges,
  };
}

/** Trigger a browser download of the architecture as JSON (native File API). */
export function downloadJSON(payload: ExportPayload, filename = 'cloudcalc-architecture.json'): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult = { nodes: AppNode[]; edges: AppEdge[]; concurrentUsers: number };

/** Parse + shape-validate a previously exported architecture. Throws on bad input. */
export function parseImport(text: string): ImportResult {
  const data = JSON.parse(text) as Partial<ExportPayload>;
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid architecture file: missing nodes/edges arrays');
  }
  return {
    nodes: data.nodes as AppNode[],
    edges: data.edges as AppEdge[],
    concurrentUsers: typeof data.concurrentUsers === 'number' ? data.concurrentUsers : 0,
  };
}

/** Human-readable markdown summary for the "Copy as Text" button (spec §6). */
export function toMarkdown(nodes: AppNode[], edges: AppEdge[], concurrentUsers: number): string {
  const lines: string[] = ['# Cloud Architecture', ''];

  const servers = nodes.filter((n) => n.type === 'server');
  if (servers.length) {
    lines.push('## Servers');
    for (const n of servers) {
      const d = n.data as ServerData;
      lines.push(`- ${d.name} (${d.tier}, ${d.os}, ${d.stack}) @ $${nodeCost(n)}/mo`);
    }
    lines.push('');
  }

  const dbs = nodes.filter((n) => n.type === 'database');
  if (dbs.length) {
    lines.push('## Databases');
    for (const n of dbs) {
      const d = n.data as DatabaseData;
      lines.push(`- ${d.db} (${d.sizeGB}GB) @ $${nodeCost(n)}/mo`);
    }
    lines.push('');
  }

  const nosql = nodes.filter((n) => n.type === 'nosql');
  if (nosql.length) {
    lines.push('## NoSQL Databases');
    for (const n of nosql) {
      const d = n.data as NoSqlData;
      lines.push(`- ${d.db} (${d.sizeGB}GB) @ $${nodeCost(n).toFixed(2)}/mo`);
    }
    lines.push('');
  }

  const storage = nodes.filter((n) => n.type === 'storage');
  if (storage.length) {
    lines.push('## Storage');
    for (const n of storage) {
      const d = n.data as StorageData;
      lines.push(`- S3 Storage (${d.sizeGB}GB) @ $${nodeCost(n).toFixed(2)}/mo`);
    }
    lines.push('');
  }

  const cache = nodes.filter((n) => n.type === 'cache');
  if (cache.length) {
    lines.push('## Cache');
    for (const n of cache) lines.push(`- Redis Cache @ $${nodeCost(n)}/mo`);
    lines.push('');
  }

  const cdns = nodes.filter((n) => n.type === 'cdn');
  if (cdns.length) {
    lines.push('## CDN');
    for (const n of cdns) {
      const d = n.data as CdnData;
      lines.push(`- CDN (${d.cachedGB}GB) @ $${nodeCost(n).toFixed(2)}/mo`);
    }
    lines.push('');
  }

  const queues = nodes.filter((n) => n.type === 'queue');
  if (queues.length) {
    lines.push('## Message Queues');
    for (const n of queues) lines.push(`- Message Queue @ $${nodeCost(n)}/mo`);
    lines.push('');
  }

  const gateways = nodes.filter((n) => n.type === 'apiGateway');
  if (gateways.length) {
    lines.push('## API Gateways');
    for (const n of gateways) lines.push(`- API Gateway @ $${nodeCost(n)}/mo`);
    lines.push('');
  }

  const lbs = nodes.filter((n) => n.type === 'loadBalancer');
  if (lbs.length) {
    lines.push('## Load Balancers');
    for (const n of lbs) lines.push(`- Load Balancer @ $${nodeCost(n)}/mo`);
    lines.push('');
  }

  const total = nodes.reduce((acc, n) => acc + nodeCost(n), 0);
  lines.push(`## Connections: ${edges.length}`);
  lines.push(`## Simulated Users: ${concurrentUsers.toLocaleString()}`);
  lines.push('');
  lines.push(`## Total Monthly Cost: $${total.toFixed(2)}`);

  return lines.join('\n');
}
