import { Injectable } from '@nestjs/common';

interface CachedResponse {
  status: number;
  body: any;
  createdAt: number;
}

@Injectable()
export class IdempotencyService {
  private readonly ttlMs = 60_000;
  private readonly cache = new Map<string, CachedResponse>();

  get(key: string): CachedResponse | undefined {
    const cached = this.cache.get(key);
    if (!cached) return;
    const age = Date.now() - cached.createdAt;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return;
    }
    return cached;
  }

  set(key: string, status: number, body: any) {
    this.cache.set(key, { status, body, createdAt: Date.now() });
  }
}
