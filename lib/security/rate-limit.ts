type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// In-memory store (for development and single-instance production).
// For multi-instance, this should be replaced with Redis.
const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  record.count += 1;
  return { success: true };
}

// Cleanup interval to prevent memory leaks in the map
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000).unref?.();
