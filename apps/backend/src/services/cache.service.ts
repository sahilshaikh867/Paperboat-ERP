import { getSharedRedisClient } from '../config/redis';

// High-speed In-Memory Cache Store (Active when Redis is not deployed or offline)
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const localMemoryCache = new Map<string, MemoryCacheEntry>();

export class CacheService {
  /**
   * Retrieve cached item from Redis (or in-memory cache)
   */
  static async get<T>(key: string): Promise<T | null> {
    const redis = getSharedRedisClient();

    if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
      try {
        const raw = await redis.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch {
        // Fall through to memory cache
      }
    }

    // In-memory fallback
    const local = localMemoryCache.get(key);
    if (local && local.expiresAt > Date.now()) {
      try {
        return JSON.parse(local.value) as T;
      } catch {
        return null;
      }
    } else if (local) {
      localMemoryCache.delete(key);
    }

    return null;
  }

  /**
   * Save item to cache with TTL in seconds (default 120 seconds)
   */
  static async set(key: string, value: any, ttlSeconds = 120): Promise<void> {
    const serialized = JSON.stringify(value);
    const redis = getSharedRedisClient();

    if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
      try {
        await redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall through to memory cache
      }
    }

    // In-memory cache
    localMemoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Remove specific key from cache
   */
  static async del(key: string): Promise<void> {
    const redis = getSharedRedisClient();

    if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
      try {
        await redis.del(key);
      } catch {
        // Fall through
      }
    }
    localMemoryCache.delete(key);
  }

  /**
   * Invalidate multiple keys matching a pattern (e.g. "academic:*")
   */
  static async delPattern(pattern: string): Promise<void> {
    const redis = getSharedRedisClient();

    if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
      try {
        const keys = await redis.keys(pattern);
        if (keys && keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Fall through
      }
    }

    // Invalidate local memory pattern
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of Array.from(localMemoryCache.keys())) {
      if (regex.test(k)) {
        localMemoryCache.delete(k);
      }
    }
  }

  /**
   * Cache-Aside Wrapper: Returns cached result if available; otherwise executes fetcher and caches.
   */
  static async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetcher();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

export default CacheService;
