// Simple in-memory rate limiter
// For production, consider using Vercel Edge Config, Upstash Redis, or similar

import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  // Check if request should be allowed
  check(identifier: string, maxRequests: number, windowSeconds: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetAt) {
      // Create new window
      const resetAt = now + windowSeconds * 1000;
      this.limits.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 60 * 1000);
}

// Rate limit configuration
export const RATE_LIMITS = {
  // Per IP address
  PER_IP: {
    maxRequests: 10, // 10 requests
    windowSeconds: 60, // per minute
  },
  // Per channel (to prevent abuse)
  PER_CHANNEL: {
    maxRequests: 5, // 5 requests
    windowSeconds: 300, // per 5 minutes
  },
} as const;

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip;
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = RATE_LIMITS.PER_IP.maxRequests,
  windowSeconds: number = RATE_LIMITS.PER_IP.windowSeconds
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimiter.check(identifier, maxRequests, windowSeconds);
}

