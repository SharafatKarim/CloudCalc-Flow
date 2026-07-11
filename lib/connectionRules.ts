import type { NodeType } from './types';

/**
 * Connection validity table (instructions.md §10, strict mode).
 * - Load Balancer → Compute Server
 * - Compute Server → Database / S3 Storage / Redis Cache
 * - Databases / Storage / Cache are sinks (never a source)
 */
export function canConnect(source: NodeType, target: NodeType): boolean {
  switch (source) {
    case 'loadBalancer':
      return target === 'server';
    case 'server':
      return target === 'database' || target === 'storage' || target === 'cache';
    default:
      return false; // database / storage / cache cannot originate connections
  }
}

const LABELS: Record<NodeType, string> = {
  server: 'Compute Server',
  loadBalancer: 'Load Balancer',
  database: 'Database',
  storage: 'S3 Storage',
  cache: 'Redis Cache',
};

export function connectionError(source: NodeType, target: NodeType): string {
  return `Cannot connect ${LABELS[source]} to ${LABELS[target]}`;
}
