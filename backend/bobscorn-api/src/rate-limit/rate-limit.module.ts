import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_STORE } from './domain/store.interface';
import { MapStore } from './infra/map.store';
import { rateLimitProviders } from './rate-limit.providers';

@Module({
  providers: [
    RateLimitService,
    ...rateLimitProviders,
    { provide: RATE_LIMIT_STORE, useClass: MapStore },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
