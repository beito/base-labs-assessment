import { Provider } from '@nestjs/common';
import { RATE_LIMIT_STORE } from './domain/store.interface';
import { MapStore } from './infra/map.store';
import { RedisStore } from './infra/redis.store';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const rateLimitProviders: Provider[] = [
  {
    provide: REDIS_CLIENT,
    useFactory: () => {
      if (process.env.RATE_STORE?.toLowerCase() !== 'redis') return null;
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      const client = new Redis(url, { lazyConnect: true });
      return client;
    },
  },

  {
    provide: RATE_LIMIT_STORE,
    useFactory: (redisClient: Redis | null) => {
      if (process.env.RATE_STORE?.toLowerCase() === 'redis') {
        if (!redisClient) throw new Error('REDIS client not available');
        return new RedisStore(redisClient);
      }
      return new MapStore();
    },
    inject: [REDIS_CLIENT],
  },
];
