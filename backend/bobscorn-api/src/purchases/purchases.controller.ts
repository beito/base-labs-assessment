import { Controller, Post, Req, Res, HttpStatus, Inject } from '@nestjs/common';
import express from 'express';
import { RateLimitService } from '../rate-limit/rate-limit.service';

@Controller('api')
export class PurchasesController {
  constructor(
    @Inject(RateLimitService)
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('buy')
  async buy(@Req() req: express.Request, @Res() res: express.Response) {
    const clientId = req.headers['x-client-id']?.toString() || 'anonymous';

    const result = await this.rateLimit.tryConsume(clientId);
    const { allowed, retryAfterSeconds, bucket } = result;

    res.setHeader('X-RateLimit-Limit', '1');
    res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
    if (!allowed) res.setHeader('Retry-After', retryAfterSeconds);

    if (allowed) {
      return res.status(HttpStatus.OK).json({
        ok: true,
        message: 'Bought successfully!',
        totalBought: bucket.totalBought,
      });
    } else {
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        ok: false,
        message: 'Too many requests — wait a bit!',
        retryAfterSeconds,
      });
    }
  }
}