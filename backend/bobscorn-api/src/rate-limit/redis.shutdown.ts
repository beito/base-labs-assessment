import { Injectable, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './rate-limit.providers';

@Injectable()
export class RedisShutdown implements OnModuleDestroy {
  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}
  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }
}
