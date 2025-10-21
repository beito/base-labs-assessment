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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import type { ClientBucket } from '../rate-limit/domain/store.interface';

@ApiTags('Purchases')
@ApiHeader({
  name: 'Authorization',
  required: false,
  description: 'Bearer <JWT from /auth/login>; if present, used as client id',
})
@ApiHeader({
  name: 'x-client-id',
  required: true,
  description: 'Unique client identifier (preferred)',
})
@ApiHeader({
  name: 'idempotency-key',
  required: false,
  description: 'Prevents double processing (optional)',
})
@ApiQuery({
  name: 'clientId',
  required: false,
  description: 'Alternative to x-client-id header (for demos/tools)',
})
@Controller('api')
export class PurchasesController {
  constructor(
    @Inject(RateLimitService)
    private readonly rateLimit: RateLimitService,
    private readonly idempotency: IdempotencyService,
  ) {}

  private getClientId(req: Request): string {
    if (typeof (req as Request & { userId?: string }).userId === 'string') {
      const t = (req as Request & { userId?: string }).userId!.trim();
      if (t) return t;
    }

    const fromHeader = readHeader(req, 'x-client-id');
    if (fromHeader) return fromHeader;

    const fromQuery = readQueryString?.(req, ['clientId']);
    if (fromQuery) return fromQuery;
    const fromBody = readBodyString(req, ['x-client-id', 'clientId']);
    if (fromBody) return fromBody;

    throw new BadRequestException('missing_client_id');
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
    headers: {
      'X-RateLimit-Limit': {
        description: 'Max tokens per minute',
        schema: { type: 'string', example: '1' },
      },
      'X-RateLimit-Remaining': {
        description: 'Tokens left this minute',
        schema: { type: 'string', example: '0' },
      },
    },
    schema: {
      example: { ok: true, message: 'Bought successfully!', totalBought: 1 },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    headers: {
      'X-RateLimit-Limit': {
        description: 'Max tokens per minute',
        schema: { type: 'string', example: '1' },
      },
      'X-RateLimit-Remaining': {
        description: 'Tokens left this minute',
        schema: { type: 'string', example: '0' },
      },
      'Retry-After': {
        description: 'Seconds until next token',
        schema: { type: 'string', example: '42' },
      },
    },
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
      const cached = await this.idempotency.get(idem);
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

    if (idem && status === HttpStatus.OK) {
      await this.idempotency.set(idem, status, body);
    }

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

function readHeader(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  const v = Array.isArray(raw) ? raw[0] : raw;
  const s = typeof v === 'string' ? v.trim() : '';
  return s || undefined;
}

function readBodyString(req: Request, keys: string[]): string | undefined {
  // body puede ser unknown; chequeamos que sea un objeto simple
  const b: unknown = (req as Request & { body?: unknown }).body;
  if (b === null || typeof b !== 'object') return undefined;
  const rec = b as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) return s;
    }
  }
  return undefined;
}

function readQueryString(req: Request, keys: string[]): string | undefined {
  const q: unknown = (req as Request & { query?: unknown }).query;
  if (q === null || typeof q !== 'object') return undefined;
  const rec = q as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}
