import { createClient, RedisClientType } from '@redis/client';
import { reportError, reportInfo } from 'node-server-engine';

type CustomRedisClient = RedisClientType<{}, {}, {}, 2>;

let redisClient: CustomRedisClient | null = null;

export const getRedisClient = (): CustomRedisClient => {
  if (!redisClient) {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    const client: CustomRedisClient = createClient<{}, {}, {}, 2>({
      url: password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`,
      RESP: 2,
      socket: {
        host,
        port,
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            reportError(new Error('Redis retry attempts exhausted.'));
            return new Error('Redis retry exhausted');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: password || undefined
    });

    client.on('connect', () => reportInfo('Connecting to local Redis...'));
    client.on('ready', () => reportInfo('Redis connected and ready to use'));
    client.on('error', (err: any) => reportError(`Redis Client Error: ${err?.message || err}`));

    redisClient = client;
  }

  return redisClient;
};

export const initRedis = async (): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    reportError(`Failed to connect to Redis: ${error}`);
  }
};
