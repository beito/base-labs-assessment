import { Inject, Injectable } from '@nestjs/common';
import { ClientBucket, RATE_LIMIT_STORE } from './domain/store.interface';
import type { IRateLimitStore } from './domain/store.interface';

type TryConsumeResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  bucket: ClientBucket;
};

@Injectable()
export class RateLimitService {
  private readonly capacity = 1;
  private readonly refillPerMinute = 1;

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: IRateLimitStore,
  ) {}

  private nowMs() {
    return Date.now();
  }

  private refill(bucket: ClientBucket): ClientBucket {
    const now = this.nowMs();
    const elapsedMs = now - bucket.lastRefillMs;
    const tokensToAdd = (elapsedMs / 60000) * this.refillPerMinute;
    const tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    return { ...bucket, tokens, lastRefillMs: now };
  }

  async getBucket(clientId: string): Promise<ClientBucket | undefined> {
    return this.store.get(clientId);
  }

  async tryConsume(clientId: string): Promise<TryConsumeResult> {
    const initial: ClientBucket = {
      tokens: this.capacity,
      lastRefillMs: this.nowMs(),
      totalBought: 0,
    };

    const existing = (await this.store.get(clientId)) ?? initial;
    const refilled = this.refill(existing);

    if (refilled.tokens >= 1) {
      const updated: ClientBucket = {
        ...refilled,
        tokens: refilled.tokens - 1,
        totalBought: refilled.totalBought + 1,
      };
      await this.store.set(clientId, updated);
      return { allowed: true, retryAfterSeconds: 0, bucket: updated };
    }
    const tokensNeeded = 1 - refilled.tokens;
    const minutesUntilNext = tokensNeeded / this.refillPerMinute;
    const retryAfterSeconds = Math.ceil(minutesUntilNext * 60);

    await this.store.set(clientId, refilled);
    return { allowed: false, retryAfterSeconds, bucket: refilled };
  }
}
