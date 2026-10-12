/**
 * Fixed-window limiter, in memory. Enough for a single instance and for
 * stopping accidental loops; put a real limiter at the edge for production.
 */
export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly perMinute: number) {}

  allow(key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + 60_000 });
      if (this.buckets.size > 10_000) this.sweep(now);
      return { ok: true, retryAfterSec: 0 };
    }
    if (b.count >= this.perMinute) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
    b.count++;
    return { ok: true, retryAfterSec: 0 };
  }

  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}
