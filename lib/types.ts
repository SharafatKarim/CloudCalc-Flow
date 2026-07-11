import type { Node, Edge } from '@xyflow/react';

/** React Flow node.type discriminators used across the app. */
export type NodeType =
  | 'server'
  | 'loadBalancer'
  | 'database'
  | 'storage'
  | 'cache'
  | 'cdn'
  | 'apiGateway'
  | 'queue'
  | 'nosql';

export type Tier = 'Micro' | 'Small' | 'Medium' | 'Large';
export type OS = 'Ubuntu' | 'Alpine' | 'Arch';
export type Stack = 'Next.js' | 'Express.js' | 'Flask' | 'Go';
export type DbKind = 'PostgreSQL' | 'MySQL';
export type NoSqlKind = 'MongoDB' | 'DynamoDB' | 'Cassandra';

/** Health buckets for a node / the whole system. */
export type Health = 'healthy' | 'warning' | 'overloaded';

// NOTE: these are `type` aliases (not `interface`) on purpose — React Flow's
// Node<T extends Record<string, unknown>> constraint accepts object *type
// aliases* but rejects interfaces (missing implicit index signature).
export type ServerData = {
  kind: 'server';
  name: string;
  tier: Tier;
  os: OS;
  stack: Stack;
};

export type LoadBalancerData = {
  kind: 'loadBalancer';
  name: string;
};

export type DatabaseData = {
  kind: 'database';
  name: string;
  db: DbKind;
  sizeGB: number;
};

export type StorageData = {
  kind: 'storage';
  name: string;
  sizeGB: number;
};

export type CacheData = {
  kind: 'cache';
  name: string;
};

export type CdnData = {
  kind: 'cdn';
  name: string;
  cachedGB: number;
};

export type ApiGatewayData = {
  kind: 'apiGateway';
  name: string;
};

export type QueueData = {
  kind: 'queue';
  name: string;
};

export type NoSqlData = {
  kind: 'nosql';
  name: string;
  db: NoSqlKind;
  sizeGB: number;
};

export type AppNodeData =
  | ServerData
  | LoadBalancerData
  | DatabaseData
  | StorageData
  | CacheData
  | CdnData
  | ApiGatewayData
  | QueueData
  | NoSqlData;

export type AppNode = Node<AppNodeData>;
export type AppEdge = Edge;

/** Serialisable slice of state that participates in history / persistence / export. */
export type SimSnapshot = {
  nodes: AppNode[];
  edges: AppEdge[];
  concurrentUsers: number;
};
