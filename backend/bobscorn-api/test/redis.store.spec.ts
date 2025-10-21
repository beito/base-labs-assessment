import { RedisStore } from '../src/rate-limit/infra/redis.store';
import type { ClientBucket } from '../src/rate-limit/domain/store.interface';
import type { Redis } from 'ioredis';

class FakeRedis {
  public get = jest.fn<Promise<string | null>, [string]>();
  public set = jest.fn<Promise<'OK'>, [string, string, 'EX', number]>();
}

describe('RedisStore', () => {
  it('set writes JSON with EX 120 and get parses bucket', async () => {
    const client = new FakeRedis();
    const store = new RedisStore(client as unknown as Redis);

    const bucket: ClientBucket = {
      tokens: 0.2,
      lastRefillMs: 123,
      totalBought: 5,
    };
    client.set.mockResolvedValue('OK');

    await store.set('u1', bucket);
    expect(client.set).toHaveBeenCalledWith(
      'corn:bucket:u1',
      JSON.stringify(bucket),
      'EX',
      120,
    );

    client.get.mockResolvedValue(JSON.stringify(bucket));
    const got = await store.get('u1');
    expect(got).toEqual(bucket);

    client.get.mockResolvedValue(null);
    const missing = await store.get('u2');
    expect(missing).toBeUndefined();
  });
});
