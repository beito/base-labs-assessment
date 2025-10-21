import { RedisShutdown } from '../src/rate-limit/redis.shutdown';
import type { Redis } from 'ioredis';

describe('RedisShutdown', () => {
  it('calls quit on destroy', async () => {
    const quit = jest.fn<Promise<unknown>, []>();
    quit.mockResolvedValue('OK');

    const disconnect = jest.fn<void, []>();

    const redis = { quit, disconnect };
    const s = new RedisShutdown(redis as unknown as Redis);

    await s.onModuleDestroy();

    expect(quit).toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('calls disconnect if quit throws', async () => {
    const quit = jest.fn<Promise<unknown>, []>();
    quit.mockRejectedValue(new Error('boom'));

    const disconnect = jest.fn<void, []>();

    const redis = { quit, disconnect };
    const s = new RedisShutdown(redis as unknown as Redis);

    await s.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
  });

  it('does nothing when client is null', async () => {
    const s = new RedisShutdown(null);
    await expect(s.onModuleDestroy()).resolves.toBeUndefined();
  });
});
