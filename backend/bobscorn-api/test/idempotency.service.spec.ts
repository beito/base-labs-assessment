import { Test } from '@nestjs/testing';
import { IdempotencyService } from '../src/common/idempotency/idempotency.service';
import { REDIS_CLIENT } from '../src/rate-limit/rate-limit.providers';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: REDIS_CLIENT, useValue: null },
      ],
    }).compile();

    service = moduleRef.get(IdempotencyService);
  });

  it('stores and returns the same payload', async () => {
    const body = { ok: true, totalBought: 1 };
    await service.set('k1', 200, body, 2);

    const cached = await service.get('k1');
    expect(cached).toBeDefined();

    if (!cached) throw new Error('expected cached entry');

    expect(cached.status).toBe(200);
    expect(cached.body).toEqual(body);
    expect(typeof cached.at).toBe('number');
  });

  it('expires entries after TTL', async () => {
    jest.useFakeTimers();

    await service.set('k2', 200, { ok: true }, 1);
    expect(await service.get('k2')).toBeDefined();

    jest.advanceTimersByTime(1_100);
    expect(await service.get('k2')).toBeUndefined();

    jest.useRealTimers();
  });
});
