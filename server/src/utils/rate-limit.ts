/**
 * A tiny in-memory limiter: at most `max` attempts per key within `windowMs`.
 * It resets when the server restarts, which is fine for protecting email sending.
 */
export function createRateLimiter(options: { max: number; windowMs: number }) {
  const attempts = new Map<string, number[]>();

  function sweep(now: number) {
    for (const [key, times] of attempts) {
      if (times.length === 0 || now - times[times.length - 1] >= options.windowMs) {
        attempts.delete(key);
      }
    }
  }

  return {
    /** Records an attempt. Returns false once the key has used up its allowance. */
    allow(key: string): boolean {
      const now = Date.now();
      const recent = (attempts.get(key) ?? []).filter((time) => now - time < options.windowMs);
      if (recent.length >= options.max) {
        attempts.set(key, recent);
        return false;
      }
      recent.push(now);
      attempts.set(key, recent);
      if (attempts.size > 5000) sweep(now);
      return true;
    },
  };
}
