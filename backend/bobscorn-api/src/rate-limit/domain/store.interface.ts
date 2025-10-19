export interface ClientBucket {
  tokens: number;
  lastRefillMs: number;
  totalBought: number;
}

export interface IRateLimitStore {
  get(clientId: string): Promise<ClientBucket | undefined>;
  set(clientId: string, value: ClientBucket): Promise<void>;
}

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');
