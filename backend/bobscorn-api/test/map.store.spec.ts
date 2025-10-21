import { MapStore } from '../src/rate-limit/infra/map.store';
import type { ClientBucket } from '../src/rate-limit/domain/store.interface';

describe('MapStore', () => {
  it('persists and returns buckets', async () => {
    const store = new MapStore();
    const b: ClientBucket = { tokens: 0.5, lastRefillMs: 1000, totalBought: 2 };
    await store.set('c1', b);
    const got = await store.get('c1');
    expect(got).toEqual(b);
  });

  it('returns undefined for unknown key', async () => {
    const store = new MapStore();
    const got = await store.get('nope');
    expect(got).toBeUndefined();
  });
});
