interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }

  if (entry.count >= config.maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRemainingRequests(identifier: string, config: RateLimitConfig): number {
  const entry = rateLimitMap.get(identifier);
  if (!entry || Date.now() > entry.resetTime) {
    return config.maxRequests;
  }
  return Math.max(0, config.maxRequests - entry.count);
}

export function cleanupExpiredEntries() {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60000);
