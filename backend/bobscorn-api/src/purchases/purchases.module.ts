import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [RateLimitModule, CommonModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
