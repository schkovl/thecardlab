import { Redis } from '@upstash/redis';
import { logger } from './logger.js';

const upstash = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

const memStore = new Map<string, { data: unknown; expiresAt: number }>();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (upstash) {
      try {
        return await upstash.get<T>(key);
      } catch (e) {
        logger.warn({ e }, 'Redis get failed, falling back to memory');
      }
    }
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
    return entry.data as T;
  },

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    if (upstash) {
      try {
        await upstash.set(key, data, { px: ttlMs });
        return;
      } catch (e) {
        logger.warn({ e }, 'Redis set failed, falling back to memory');
      }
    }
    memStore.set(key, { data, expiresAt: Date.now() + ttlMs });
  },
};
