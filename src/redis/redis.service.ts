import { getRedisClient } from './redis.client';
import { reportError } from 'node-server-engine';

// ⏱️ Dedicated TTL Constants (in seconds)
export const CACHE_TTL = {
  EMPLOYEES: 300,        // 5 Minutes (300 seconds)
  DEPARTMENTS: 15,       // ⚡ Short TTL: 15 Seconds (High-frequency refresh)
  AUTH_SESSION: 3600,    // 1 Hour (3600 seconds)
  DEFAULT: 3600          // 1 Hour default
};

const DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10);

export class CacheService {
  /**
   * Get data from Redis cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      if (!client.isOpen) return null;

      const data = await client.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      reportError(`Redis GET Error for key "${key}": ${error}`);
      return null; // Automatically fall back to PostgreSQL
    }
  }

  /**
   * Save data into Redis with TTL (Time To Live in seconds)
   */
  static async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client.isOpen) return;

      const serialized = JSON.stringify(value);
      await client.setEx(key, ttlSeconds, serialized);
    } catch (error) {
      reportError(`Redis SET Error for key "${key}": ${error}`);
    }
  }

  /**
   * Delete a specific cache key
   */
  static async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client.isOpen) return;

      await client.del(key);
    } catch (error) {
      reportError(`Redis DEL Error for key "${key}": ${error}`);
    }
  }
}
