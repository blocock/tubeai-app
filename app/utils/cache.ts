// Simple in-memory cache with TTL
// For production, consider using Vercel KV, Redis, or similar

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const cache = new SimpleCache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000);
}

// Cache keys
export const CACHE_KEYS = {
  channelVideos: (channelId: string) => `channel:videos:${channelId}`,
  topicAnalysis: (channelId: string) => `channel:topics:${channelId}`,
} as const;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  CHANNEL_VIDEOS: 60 * 60, // 1 hour
  TOPIC_ANALYSIS: 24 * 60 * 60, // 24 hours
} as const;

export function getCached<T>(key: string): T | null {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, data, ttlSeconds);
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

