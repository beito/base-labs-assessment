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
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import type { ClientBucket } from '../rate-limit/domain/store.interface';

@Controller('api')
export class PurchasesController {
  constructor(
    @Inject(RateLimitService)
    private readonly rateLimit: RateLimitService,
    private readonly idempotency: IdempotencyService,
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
    const keyHeader = req.headers['idempotency-key'];
    const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
    const idem = typeof key === 'string' && key.trim() ? key.trim() : undefined;

    if (idem) {
      const cached = this.idempotency.get(idem);
      if (cached) {
        return res.status(cached.status).json(cached.body);
      }
    }

    const clientId = this.getClientId(req);
    const { allowed, retryAfterSeconds, bucket } =
      await this.rateLimit.tryConsume(clientId);

    res.setHeader('X-RateLimit-Limit', '1');
    res.setHeader('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
    if (!allowed) res.setHeader('Retry-After', String(retryAfterSeconds));

    const status = allowed ? HttpStatus.OK : HttpStatus.TOO_MANY_REQUESTS;
    const body = allowed
      ? {
          ok: true,
          message: 'Bought successfully!',
          totalBought: bucket.totalBought,
        }
      : {
          ok: false,
          message: 'Too many requests — wait a bit!',
          retryAfterSeconds,
        };

    if (idem && status === HttpStatus.OK) {
      this.idempotency.set(idem, status, body);
    }

    return res.status(status).json(body);
  }

  @Get('me')
  async me(@Req() req: express.Request) {
    const clientId = this.getClientId(req);
    const bucket: ClientBucket | undefined =
      await this.rateLimit.getBucket(clientId);
    return { totalBought: bucket?.totalBought ?? 0 };
  }
}
