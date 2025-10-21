import { RateLimitService } from '../src/rate-limit/rate-limit.service';
import { Test } from '@nestjs/testing';

import {
  RATE_LIMIT_STORE,
  type ClientBucket,
  type IRateLimitStore,
} from '../src/rate-limit/domain/store.interface';

class MemStore implements IRateLimitStore {
  private map = new Map<string, ClientBucket>();

  get(id: string): Promise<ClientBucket | undefined> {
    return Promise.resolve(this.map.get(id));
  }

  set(id: string, value: ClientBucket): Promise<void> {
    this.map.set(id, value);
    return Promise.resolve();
  }
}

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const store: IRateLimitStore = new MemStore();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RATE_LIMIT_STORE, useValue: store },
      ],
    }).compile();

    service = moduleRef.get(RateLimitService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows the first purchase', async () => {
    const result = await service.tryConsume('julio');
    expect(result.allowed).toBe(true);
    expect(result.bucket.totalBought).toBe(1);
    expect(Math.floor(result.bucket.tokens)).toBe(0);
  });

  it('blocks the second purchase within the same minute', async () => {
    await service.tryConsume('julio');
    const result = await service.tryConsume('julio');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('refills after 60 seconds and allows purchase again', async () => {
    await service.tryConsume('julio');
    jest.advanceTimersByTime(61_000);
    const result = await service.tryConsume('julio');
    expect(result.allowed).toBe(true);
    expect(result.bucket.totalBought).toBe(2);
  });

  it('getBucket returns accumulated total', async () => {
    await service.tryConsume('julio');
    const bucket = await service.getBucket('julio');
    expect(bucket?.totalBought).toBe(1);
  });
});
