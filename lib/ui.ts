import type { Health } from './types';

/** Compact currency formatter — no cents for whole dollars. */
export function usd(n: number): string {
  return `$${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)}`;
}

/** RAM utilisation bar colour bands (spec §3). */
export function utilBarColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-orange-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

export function healthDot(h: Health): string {
  return h === 'overloaded' ? '🔴' : h === 'warning' ? '🟡' : '🟢';
}

export function healthLabel(h: Health): string {
  return h === 'overloaded' ? 'Overloaded' : h === 'warning' ? 'Warning' : 'Healthy';
}

export function healthTextColor(h: Health): string {
  return h === 'overloaded'
    ? 'text-red-500'
    : h === 'warning'
      ? 'text-amber-500'
      : 'text-emerald-500';
}
