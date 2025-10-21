import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private readonly auth: AuthService) {}
  async use(req: Request, _res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
      const token = h.slice('Bearer '.length).trim();
      const verified = await this.auth.verify(token);
      if (verified?.sub) req.userId = verified.sub;
    }
    next();
  }
}
