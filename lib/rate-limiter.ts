/**
 * Rate Limiting System
 *
 * Implements token bucket algorithm for API rate limiting.
 * Enforces 30 requests per minute per user with sliding window approach.
 */

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  userId: string; // User identifier
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry allowed
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  userId: string;
}

/**
 * In-memory rate limit store using token bucket algorithm
 */
class RateLimitStore {
  private buckets: Map<string, TokenBucket> = new Map();
  private readonly maxTokens: number = 30; // 30 requests
  private readonly refillRate: number = 30 / 60; // 30 tokens per 60 seconds = 0.5 tokens/sec

  /**
   * Check if request is allowed and consume a token
   */
  checkLimit(userId: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(userId);

    // Initialize bucket if doesn't exist
    if (!bucket) {
      bucket = {
        tokens: this.maxTokens - 1, // Consume one token immediately
        lastRefill: now,
        userId,
      };
      this.buckets.set(userId, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: new Date(now + 60000), // Reset in 60 seconds
      };
    }

    // Calculate tokens to add based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.refillRate;

    // Refill bucket (capped at max)
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1; // Consume one token
      this.buckets.set(userId, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: new Date(now + 60000),
      };
    }

    // Rate limit exceeded - calculate retry time
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterMs = (tokensNeeded / this.refillRate) * 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + retryAfterMs),
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  /**
   * Get current status without consuming a token
   */
  getStatus(userId: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket) {
      return {
        allowed: true,
        remaining: this.maxTokens,
        resetAt: new Date(now + 60000),
      };
    }

    // Calculate current tokens without refilling
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.refillRate;
    const currentTokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);

    return {
      allowed: currentTokens >= 1,
      remaining: Math.floor(currentTokens),
      resetAt: new Date(now + 60000),
    };
  }

  /**
   * Reset rate limit for a user (admin/testing purposes)
   */
  reset(userId: string): void {
    this.buckets.delete(userId);
  }

  /**
   * Clean up old buckets (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [userId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(userId);
      }
    }
  }
}

// Singleton instance
const rateLimitStore = new RateLimitStore();

// Cleanup old buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);
}

/**
 * Check if a request is allowed under rate limits
 */
export function checkRateLimit(userId: string): RateLimitResult {
  if (!userId) {
    // Anonymous users - stricter limit or require auth
    userId = 'anonymous';
  }

  return rateLimitStore.checkLimit(userId);
}

/**
 * Get current rate limit status without consuming a token
 */
export function getRateLimitStatus(userId: string): RateLimitResult {
  if (!userId) {
    userId = 'anonymous';
  }

  return rateLimitStore.getStatus(userId);
}

/**
 * Reset rate limit for a user (testing/admin)
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.reset(userId);
}

/**
 * Format rate limit info for response headers
 */
export function formatRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '30',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(result: RateLimitResult): {
  message: string;
  retryAfter: number;
  resetAt: string;
} {
  return {
    message: `Rate limit exceeded. You can make 30 requests per minute. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter || 0,
    resetAt: result.resetAt.toISOString(),
  };
}
