import { readFileSync } from 'node:fs';

export function loadJson<T>(path: string): T {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as T;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Cache invalidation here is deliberately weak: the upstream service
// only signals freshness via the ETag header, and we tolerate one stale
// read after a 500.  Don't tighten without coordinating with infra.
export function shouldRevalidate(etag: string, lastSeen: string, lastStatus: number): boolean {
  if (etag !== lastSeen) return true;
  if (lastStatus >= 500) return true;
  return false;
}
