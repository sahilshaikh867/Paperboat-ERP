import IORedis, { RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Check if external Redis has been explicitly configured in environment
export const isRedisConfigured = Boolean(
  redisUrl || redisHost || process.env.ENABLE_LOCAL_REDIS === 'true'
);

const baseOptions: RedisOptions = {
  host: redisHost || '127.0.0.1',
  port: redisPort,
  password: redisPassword,
  retryStrategy(times) {
    // Stop reconnect spamming if Redis server does not exist
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 1000);
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

export const redisConnectionOptions = baseOptions;

/**
 * Creates a BullMQ Redis connection if configured, otherwise returns null
 */
export function createRedisConnection(): IORedis | null {
  if (!isRedisConfigured) {
    return null;
  }

  try {
    const client = redisUrl
      ? new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true })
      : new IORedis(baseOptions);

    client.on('error', () => {
      // Catch connection errors silently to prevent process termination
    });

    return client;
  } catch {
    return null;
  }
}

/**
 * Shared singleton Redis client for database query caching (optional with in-memory fallback)
 */
let sharedRedisClient: IORedis | null = null;
let hasLoggedStatus = false;

export function getSharedRedisClient(): IORedis | null {
  if (!isRedisConfigured) {
    if (!hasLoggedStatus) {
      console.log('💡 In-Memory High-Speed Cache Active (Redis URL not set - operating in standalone mode).');
      hasLoggedStatus = true;
    }
    return null;
  }

  if (!sharedRedisClient) {
    try {
      if (redisUrl) {
        sharedRedisClient = new IORedis(redisUrl, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: null,
        });
      } else {
        sharedRedisClient = new IORedis({
          ...baseOptions,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
      }

      sharedRedisClient.on('connect', () => {
        console.log('⚡ Redis Cache Engine: Connected to Redis server.');
      });

      sharedRedisClient.on('error', () => {
        // Handled silently by CacheService fallback
      });

      sharedRedisClient.connect().catch(() => {
        // Fallback active
      });
    } catch {
      sharedRedisClient = null;
    }
  }

  return sharedRedisClient;
}
