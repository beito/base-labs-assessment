import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  HttpStatus,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import express from 'express';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import type { ClientBucket } from '../rate-limit/domain/store.interface';

@Controller('api')
export class PurchasesController {
  constructor(
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  private getClientId(req: express.Request): string {
    const raw = req.headers['x-client-id'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id) throw new BadRequestException('missing_client_id');
    return id;
  }

  @Post('buy')
  async buy(@Req() req: express.Request, @Res() res: express.Response) {
    const clientId = this.getClientId(req);
    const { allowed, retryAfterSeconds, bucket } =
      await this.rateLimit.tryConsume(clientId);

    res.setHeader('X-RateLimit-Limit', '1');
    res.setHeader('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
    if (!allowed) res.setHeader('Retry-After', String(retryAfterSeconds));

    if (allowed) {
      return res.status(HttpStatus.OK).json({
        ok: true,
        message: '🌽 Bought successfully!',
        totalBought: bucket.totalBought,
      });
    }
    return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      ok: false,
      message: 'Too many requests — wait a bit!',
      retryAfterSeconds,
    });
  }

  @Get('me')
  async me(@Req() req: express.Request) {
    const clientId = this.getClientId(req);
    const bucket: ClientBucket | undefined =
      await this.rateLimit.getBucket(clientId);
    return { totalBought: bucket?.totalBought ?? 0 };
  }
}
