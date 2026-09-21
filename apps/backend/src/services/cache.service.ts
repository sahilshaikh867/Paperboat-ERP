import { getSharedRedisClient } from '../config/redis';

// In-memory fallback cache map if Redis is temporarily offline
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const localMemoryFallback = new Map<string, MemoryCacheEntry>();

export class CacheService {
  private static redis = getSharedRedisClient();

  /**
   * Retrieve cached item from Redis (with fallback to local memory)
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis.status === 'ready' || this.redis.status === 'connect') {
        const raw = await this.redis.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      }
    } catch (err: any) {
      console.warn(`[CacheService.get] Redis lookup error for "${key}":`, err.message);
    }

    // Local memory fallback
    const local = localMemoryFallback.get(key);
    if (local && local.expiresAt > Date.now()) {
      try {
        return JSON.parse(local.value) as T;
      } catch {
        return null;
      }
    } else if (local) {
      localMemoryFallback.delete(key);
    }

    return null;
  }

  /**
   * Save item to cache with TTL in seconds (default 300 seconds = 5 minutes)
   */
  static async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      if (this.redis.status === 'ready' || this.redis.status === 'connect') {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      }
    } catch (err: any) {
      console.warn(`[CacheService.set] Redis set error for "${key}":`, err.message);
    }

    // Local memory fallback
    localMemoryFallback.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Remove specific key from cache
   */
  static async del(key: string): Promise<void> {
    try {
      if (this.redis.status === 'ready' || this.redis.status === 'connect') {
        await this.redis.del(key);
      }
    } catch (err: any) {
      console.warn(`[CacheService.del] Redis del error for "${key}":`, err.message);
    }
    localMemoryFallback.delete(key);
  }

  /**
   * Invalidate multiple keys matching a pattern (e.g., "academic:org123:*")
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      if (this.redis.status === 'ready' || this.redis.status === 'connect') {
        const keys = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (err: any) {
      console.warn(`[CacheService.delPattern] Redis delPattern error for "${pattern}":`, err.message);
    }

    // Local memory pattern deletion
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of Array.from(localMemoryFallback.keys())) {
      if (regex.test(k)) {
        localMemoryFallback.delete(k);
      }
    }
  }

  /**
   * Cache-Aside Wrapper: Returns cached result if available; otherwise invokes fetcher, caches, and returns.
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
