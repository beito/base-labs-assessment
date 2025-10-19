import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { PurchasesModule } from './purchases/purchases.module';

@Module({
  imports: [EventEmitterModule.forRoot(), RateLimitModule, PurchasesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
