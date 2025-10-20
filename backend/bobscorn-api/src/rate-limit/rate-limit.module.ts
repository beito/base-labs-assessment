import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_STORE } from './domain/store.interface';
import { MapStore } from './infra/map.store';

@Module({
  providers: [
    RateLimitService,
    { provide: RATE_LIMIT_STORE, useClass: MapStore },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
