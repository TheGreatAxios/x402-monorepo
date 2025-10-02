export interface ICache {
  fetch<T>(key: string, loader?: () => Promise<T> | T, ttlMs?: number): Promise<T | undefined>;
  set(key: string, value: any, ttlMs?: number): Promise<void> | void;
  del(key: string): Promise<void> | void;
  clear?(): void;
}

type MemEntry = { value: any; expiresAt: number | null };

export class InMemoryCache implements ICache {
  private store = new Map<string, MemEntry>();
  constructor(private defaultTTL: number = 0) {}
  private now() { return Date.now(); }
  async fetch<T>(key: string, loader?: () => Promise<T> | T, ttlMs?: number): Promise<T | undefined> {
    const e = this.store.get(key);
    const now = this.now();
    if (e) {
      if (e.expiresAt !== null && e.expiresAt <= now) this.store.delete(key); else return e.value as T;
    }
    if (!loader) return undefined;
    const result = await loader();
    this.set(key, result, ttlMs ?? this.defaultTTL);
    return result;
  }
  set(key: string, value: any, ttlMs: number = 0) {
    const now = this.now();
    const expiresAt = ttlMs > 0 ? now + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }
  del(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

// Simple Redis cache using ioredis if available
export class RedisCache implements ICache {
  private client: any;
  constructor(redisUrl: string) {
    // dynamic import for ioredis
    const IORedis = require('ioredis');
    this.client = new IORedis(redisUrl);
  }
  async fetch<T>(key: string, loader?: () => Promise<T> | T, ttlMs?: number): Promise<T | undefined> {
    const v = await this.client.get(key);
    if (v) {
      try { return JSON.parse(v) as T; } catch { /* ignore */ }
    }
    if (!loader) return undefined;
    const result = await loader();
    await this.set(key, result, ttlMs);
    return result;
  }
  async set(key: string, value: any, ttlMs?: number) {
    const payload = JSON.stringify(value);
    if (ttlMs && ttlMs > 0) await this.client.set(key, payload, 'PX', ttlMs);
    else await this.client.set(key, payload);
  }
  async del(key: string) { await this.client.del(key); }
}
