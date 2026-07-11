import type { Tier, OS, Stack, DbKind, NoSqlKind } from './types';

/** Hardcoded infrastructure catalogue (instructions.md §1). All memory in MB, cost in USD/mo. */

export type TierSpec = {
  ramMB: number;
  vcpu: number;
  cost: number;
  /** Baseline response-time contribution (ms) before RAM-pressure penalty. */
  respBaselineMs: number;
  /** Tier max throughput (req/s) at 0% utilisation. */
  maxThroughput: number;
};

export const SERVER_TIERS: Record<Tier, TierSpec> = {
  Micro: { ramMB: 1024, vcpu: 2, cost: 8, respBaselineMs: 50, maxThroughput: 100 },
  Small: { ramMB: 2048, vcpu: 2, cost: 16, respBaselineMs: 20, maxThroughput: 500 },
  Medium: { ramMB: 4096, vcpu: 4, cost: 32, respBaselineMs: 10, maxThroughput: 2000 },
  Large: { ramMB: 8192, vcpu: 8, cost: 64, respBaselineMs: 5, maxThroughput: 5000 },
};

export const TIER_ORDER: Tier[] = ['Micro', 'Small', 'Medium', 'Large'];

/** Base RAM overhead of the operating system (MB). */
export const OS_OVERHEAD: Record<OS, number> = {
  Ubuntu: 400,
  Alpine: 50,
  Arch: 100,
};

export type StackSpec = {
  /** Memory footprint per 100 concurrent users (MB) — from spec §1. */
  perHundredMB: number;
  /**
   * Framework idle memory (MB) — spec references "Framework Idle Memory" but
   * leaves the number open. Chosen here proportional to each stack's weight.
   */
  idleMB: number;
};

export const TECH_STACKS: Record<Stack, StackSpec> = {
  'Next.js': { perHundredMB: 150, idleMB: 120 },
  'Express.js': { perHundredMB: 80, idleMB: 60 },
  Flask: { perHundredMB: 50, idleMB: 40 },
  Go: { perHundredMB: 20, idleMB: 15 },
};

/** Database fixed cost for the first GB (spec §1). */
export const DB_BASE_COST: Record<DbKind, number> = { PostgreSQL: 10, MySQL: 8 };
/** $/GB beyond the first GB. Spec fixes only the 1GB price; this is a documented assumption. */
export const DB_PER_GB = 2;

export const STORAGE_BASE_COST = 5; // S3-like base
export const STORAGE_PER_GB = 0.1; // + $0.10 per GB

export const CACHE_COST = 15; // Redis fixed

export const LB_COST = 20;
export const LB_CAPACITY = 1000; // concurrent connections per instance

// --- Extended components (cost + connections only) ---
export const CDN_BASE = 20; // CDN base $/mo
export const CDN_PER_GB = 0.08; // + per GB cached/transferred
export const API_GATEWAY_COST = 15; // fixed $/mo
export const QUEUE_COST = 25; // message queue fixed $/mo

/** NoSQL base cost per engine (first GB). */
export const NOSQL_BASE: Record<NoSqlKind, number> = {
  MongoDB: 12,
  DynamoDB: 15,
  Cassandra: 14,
};
export const NOSQL_PER_GB = 1.5; // $/GB beyond the first GB
export const NOSQL_LIST: NoSqlKind[] = ['MongoDB', 'DynamoDB', 'Cassandra'];

/** Avg data transferred per user per month (GB). Spec leaves this open — documented default. */
export const BANDWIDTH_PER_USER_GB_MO = 2;

export const OS_LIST: OS[] = ['Ubuntu', 'Alpine', 'Arch'];
export const STACK_LIST: Stack[] = ['Next.js', 'Express.js', 'Flask', 'Go'];
export const DB_LIST: DbKind[] = ['PostgreSQL', 'MySQL'];

/** Palette metadata for the left sidebar. */
export type PaletteItem = {
  type:
    | 'server'
    | 'loadBalancer'
    | 'apiGateway'
    | 'database'
    | 'nosql'
    | 'storage'
    | 'cache'
    | 'cdn'
    | 'queue';
  label: string;
  icon: string; // lucide icon name
  hint: string;
};

export const PALETTE: PaletteItem[] = [
  { type: 'server', label: 'Compute Server', icon: 'Server', hint: 'Micro/Ubuntu/Next.js · from $8/mo' },
  { type: 'loadBalancer', label: 'Load Balancer', icon: 'Scale', hint: 'Distributes traffic · $20/mo, 1k conns' },
  { type: 'apiGateway', label: 'API Gateway', icon: 'Waypoints', hint: 'Entry point → servers · $15/mo' },
  { type: 'database', label: 'SQL Database', icon: 'Database', hint: 'PostgreSQL/MySQL · from $8/mo' },
  { type: 'nosql', label: 'NoSQL Database', icon: 'Boxes', hint: 'MongoDB/DynamoDB · from $12/mo' },
  { type: 'storage', label: 'S3 Storage', icon: 'HardDrive', hint: 'Object store · $5/mo + $0.10/GB' },
  { type: 'cache', label: 'Redis Cache', icon: 'Zap', hint: 'In-memory cache · $15/mo' },
  { type: 'cdn', label: 'CDN', icon: 'Globe', hint: 'Edge cache · $20/mo + $0.08/GB' },
  { type: 'queue', label: 'Message Queue', icon: 'Inbox', hint: 'Kafka/RabbitMQ · $25/mo' },
];
