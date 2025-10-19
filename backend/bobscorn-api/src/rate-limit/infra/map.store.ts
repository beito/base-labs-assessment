import { ClientBucket, IRateLimitStore } from '../domain/store.interface';

export class MapStore implements IRateLimitStore {
  private map = new Map<string, ClientBucket>();

  get(id: string): Promise<ClientBucket | undefined> {
    return Promise.resolve(this.map.get(id));
  }

  set(id: string, value: ClientBucket): Promise<void> {
    this.map.set(id, value);
    return Promise.resolve();
  }
}