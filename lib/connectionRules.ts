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
    case 'apiGateway':
      // Traffic entry points route only to Compute Servers.
      return target === 'server';
    case 'server':
      // Servers write to data / cache / edge / queue sinks.
      return (
        target === 'database' ||
        target === 'nosql' ||
        target === 'storage' ||
        target === 'cache' ||
        target === 'cdn' ||
        target === 'queue'
      );
    default:
      return false; // sinks cannot originate connections
  }
}

const LABELS: Record<NodeType, string> = {
  server: 'Compute Server',
  loadBalancer: 'Load Balancer',
  apiGateway: 'API Gateway',
  database: 'SQL Database',
  nosql: 'NoSQL Database',
  storage: 'S3 Storage',
  cache: 'Redis Cache',
  cdn: 'CDN',
  queue: 'Message Queue',
};

export function connectionError(source: NodeType, target: NodeType): string {
  return `Cannot connect ${LABELS[source]} to ${LABELS[target]}`;
}
