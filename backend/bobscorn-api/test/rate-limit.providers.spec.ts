import { Test } from '@nestjs/testing';
import {
  rateLimitProviders,
  REDIS_CLIENT,
} from '../src/rate-limit/rate-limit.providers';
import {
  RATE_LIMIT_STORE,
  type IRateLimitStore,
} from '../src/rate-limit/domain/store.interface';
import { MapStore } from '../src/rate-limit/infra/map.store';
import { RedisStore } from '../src/rate-limit/infra/redis.store';
import type { Redis } from 'ioredis';

const OLD_ENV = process.env;

describe('rateLimitProviders', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('injects MapStore when RATE_STORE!=redis', async () => {
    process.env.RATE_STORE = 'memory';
    const moduleRef = await Test.createTestingModule({
      providers: rateLimitProviders,
    }).compile();

    const store = moduleRef.get<unknown, IRateLimitStore>(RATE_LIMIT_STORE);
    expect(store).toBeInstanceOf(MapStore);

    const redis = moduleRef.get<unknown, Redis | null>(REDIS_CLIENT);
    expect(redis).toBeNull();
  });

  it('injects RedisStore when RATE_STORE=redis and client exists', async () => {
    process.env.RATE_STORE = 'redis';
    const fakeRedis = {} as unknown as Redis;

    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: REDIS_CLIENT, useValue: fakeRedis },
        {
          provide: RATE_LIMIT_STORE,
          useFactory: (rc: Redis | null) => {
            if (!rc) throw new Error('missing client');
            return new RedisStore(rc);
          },
          inject: [REDIS_CLIENT],
        },
      ],
    }).compile();

    const store = moduleRef.get<unknown, IRateLimitStore>(RATE_LIMIT_STORE);
    expect(store).toBeInstanceOf(RedisStore);
  });

  it('throws when RATE_STORE=redis but REDIS_CLIENT is null', async () => {
    process.env.RATE_STORE = 'redis';

    const mod = Test.createTestingModule({
      providers: rateLimitProviders,
    });

    await expect(mod.compile()).rejects.toThrow(/REDIS client not available/i);
  });
});
