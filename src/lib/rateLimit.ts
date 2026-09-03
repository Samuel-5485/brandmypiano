type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function getBucket(key: string, windowMs: number): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    const fresh = { count: 0, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return fresh;
  }
  return existing;
}

/** Check without incrementing failed attempts. */
export function isRateLimited(
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean {
  const bucket = getBucket(key, windowMs);
  return bucket.count >= maxAttempts;
}

/** Record a failed attempt. */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number,
  windowMs: number,
): void {
  const bucket = getBucket(key, windowMs);
  bucket.count += 1;
  buckets.set(key, bucket);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
