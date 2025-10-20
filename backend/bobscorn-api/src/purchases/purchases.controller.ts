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
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import type { ClientBucket } from '../rate-limit/domain/store.interface';

@ApiTags('Purchases')
@ApiHeader({
  name: 'x-client-id',
  required: true,
  description: 'Unique client identifier',
})
@ApiHeader({
  name: 'idempotency-key',
  required: false,
  description: 'Prevents double processing (optional)',
})
@Controller('api')
export class PurchasesController {
  constructor(
    @Inject(RateLimitService)
    private readonly rateLimit: RateLimitService,
    private readonly idempotency: IdempotencyService,
  ) {}

  private getClientId(req: Request): string {
    const raw = req.headers['x-client-id'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id) throw new BadRequestException('missing_client_id');
    return id;
  }

  private getIdempotencyKey(req: Request): string | undefined {
    const raw = req.headers['idempotency-key'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const key = typeof value === 'string' ? value.trim() : '';
    return key || undefined;
  }

  @ApiOperation({ summary: 'Buy one corn (rate limit: 1 per minute)' })
  @ApiResponse({
    status: 200,
    description: 'Purchase successful',
    schema: {
      example: { ok: true, message: 'Bought successfully!', totalBought: 1 },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: {
        ok: false,
        message: 'Too many requests — wait a bit!',
        retryAfterSeconds: 42,
      },
    },
  })
  @Post('buy')
  async buy(@Req() req: Request, @Res() res: Response) {
    const idem = this.getIdempotencyKey(req);
    if (idem) {
      const cached = this.idempotency.get(idem);
      if (cached) return res.status(cached.status).json(cached.body);
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

    if (idem && status === HttpStatus.OK)
      this.idempotency.set(idem, status, body);

    return res.status(status).json(body);
  }

  @ApiOperation({ summary: 'Get total corns bought by this client' })
  @ApiResponse({ status: 200, schema: { example: { totalBought: 3 } } })
  @Get('me')
  async me(@Req() req: Request) {
    const clientId = this.getClientId(req);
    const bucket: ClientBucket | undefined =
      await this.rateLimit.getBucket(clientId);
    return { totalBought: bucket?.totalBought ?? 0 };
  }
}
