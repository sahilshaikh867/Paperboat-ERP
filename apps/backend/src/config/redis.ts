import IORedis, { RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const baseOptions: RedisOptions = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy(times) {
    // Reconnect with exponential backoff up to 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: true,
  lazyConnect: true,
};

export const redisConnectionOptions = baseOptions;

/**
 * BullMQ requires distinct Redis connections per Queue / Worker instance
 */
export function createRedisConnection(): IORedis {
  if (redisUrl) {
    return new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
  }
  return new IORedis(baseOptions);
}

/**
 * Shared singleton Redis client for database query caching and fast in-memory key-value lookups
 */
let sharedRedisClient: IORedis | null = null;

export function getSharedRedisClient(): IORedis {
  if (!sharedRedisClient) {
    if (redisUrl) {
      sharedRedisClient = new IORedis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
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

    sharedRedisClient.on('error', (err) => {
      console.warn('⚠️ Redis Cache Engine Warning (operating in graceful fallback):', err.message);
    });

    // Initiate connection asynchronously
    sharedRedisClient.connect().catch((err) => {
      console.warn('⚠️ Redis initial connection deferred / fallback active:', err.message);
    });
  }
  return sharedRedisClient;
}
