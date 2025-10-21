import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../rate-limit/rate-limit.providers';

export interface IdempotencyEntry {
  status: number;
  body: unknown;
  at: number;
}

function isIdempotencyEntry(x: unknown): x is IdempotencyEntry {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.status === 'number' &&
    'body' in r && // puede ser cualquier cosa (unknown)
    typeof r.at === 'number'
  );
}

@Injectable()
export class IdempotencyService {
  private readonly map = new Map<string, IdempotencyEntry>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  private key(id: string) {
    return `corn:idemp:${id}`;
  }

  async get(key: string): Promise<IdempotencyEntry | undefined> {
    if (this.redis) {
      const txt = await this.redis.get(this.key(key));
      if (!txt) return undefined;

      let parsed: unknown;
      try {
        parsed = JSON.parse(txt);
      } catch {
        return undefined;
      }
      return isIdempotencyEntry(parsed) ? parsed : undefined;
    }
    return this.map.get(key);
  }

  async set(
    key: string,
    status: number,
    body: unknown,
    ttlSec = 60,
  ): Promise<void> {
    const payload: IdempotencyEntry = { status, body, at: Date.now() };

    if (this.redis) {
      await this.redis.set(
        this.key(key),
        JSON.stringify(payload),
        'EX',
        ttlSec,
      );
      return;
    }

    this.map.set(key, payload);
    setTimeout(() => this.map.delete(key), ttlSec * 1000);
  }
}
