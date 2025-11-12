import { kv } from '@vercel/kv';

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

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await kv.get<T>(key);
    return value ?? null;
  } catch (error) {
    // If KV is not configured or unavailable, return null
    console.error('Error getting from cache:', error);
    return null;
  }
}

export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  try {
    await kv.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    // If KV is not configured or unavailable, silently fail
    console.error('Error setting cache:', error);
  }
}

export async function clearCache(key?: string): Promise<void> {
  if (!key) {
    console.warn('clearCache() called without key - Vercel KV does not support clearing all keys');
    return;
  }

  try {
    await kv.del(key);
  } catch (error) {
    console.error('Error deleting from cache:', error);
  }
}
