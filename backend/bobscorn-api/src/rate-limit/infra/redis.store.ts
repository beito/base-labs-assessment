import { Injectable } from '@nestjs/common';
import type { ClientBucket, IRateLimitStore } from '../domain/store.interface';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisStore implements IRateLimitStore {
  constructor(private readonly redis: Redis) {}

  private key(id: string) {
    return `corn:bucket:${id}`;
  }

  async get(clientId: string): Promise<ClientBucket | undefined> {
    const json = await this.redis.get(this.key(clientId));
    return json ? (JSON.parse(json) as ClientBucket) : undefined;
  }

  async set(clientId: string, value: ClientBucket): Promise<void> {
    await this.redis.set(this.key(clientId), JSON.stringify(value), 'EX', 120);
  }
}
