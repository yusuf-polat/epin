import Redis from 'ioredis';
import { env } from './env';
import { logger } from '@/utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => Math.min(times * 200, 3000),
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('ready', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.warn('Redis unavailable', { error: err.message }));

const isReady = () => redis.status === 'ready';

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis initial connection failed, cache disabled until reconnect', {
      error: (err as Error).message,
    });
  }
}

/** Cache okuma: Redis erişilemezse sessizce null döner */
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!isReady()) return null;
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function setCachedData(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  if (!isReady()) return;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Cache yazılamazsa uygulama akışı etkilenmemeli
  }
}

export async function invalidateCache(...patterns: string[]): Promise<void> {
  if (!isReady()) return;
  for (const pattern of patterns) {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length > 0) await redis.del(...keys);
      }
    } catch {
      // yoksay
    }
  }
}
