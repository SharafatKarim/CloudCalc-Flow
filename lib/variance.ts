import type { AppNode } from './types';

/**
 * Deterministic, seeded variance helpers (pure).
 *
 * Real load balancers do not split traffic evenly and per-component usage
 * fluctuates. We model that with jitter derived from a stable per-node seed
 * combined with a global variance seed, hashed through an integer mixer — so
 * results are reproducible (undo/redo + JSON export stay exact) and never
 * flicker between renders the way `Math.random()` would.
 */

export type VarianceOpts = { enabled: boolean; varianceSeed: number };

/** Distinct salts so the four variance channels are independent. */
export const SALT_WEIGHT = 0x9e3779b1;
export const SALT_USAGE = 0x85ebca77;
export const SALT_RESP = 0xc2b2ae3d;
export const SALT_SINK = 0x27d4eb2f;

/** Mix two 32-bit integers into a well-distributed uint32. */
export function hash2(a: number, b: number): number {
  let h = (a | 0) ^ Math.imul(b | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return h >>> 0;
}

/** Deterministic value in [0, 1) from two seeds. */
export function unit(a: number, b: number): number {
  return hash2(a, b) / 4294967296;
}

/** Deterministic value in [min, max) from a seed + salt. */
export function jitter(seed: number, salt: number, min: number, max: number): number {
  return min + unit(seed, salt) * (max - min);
}

/** FNV-1a hash of a string → uint32 (fallback seed for legacy nodes). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable seed for a node — its persisted `data.seed`, or a hash of its id. */
export function nodeSeed(node: AppNode): number {
  const s = (node.data as { seed?: number }).seed;
  return typeof s === 'number' ? s : hashString(node.id);
}
