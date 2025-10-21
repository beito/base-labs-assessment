import { JwtAuthMiddleware } from '../src/auth/jwt.middleware';
import type { Request, Response } from 'express';
import { AuthService } from '../src/auth/auth.service';

describe('JwtAuthMiddleware', () => {
  function makeReq(authHeader?: string): Request {
    const req = { headers: {} } as unknown as Request & {
      headers: Record<string, unknown>;
      userId?: string;
    };
    if (authHeader) req.headers.authorization = authHeader;
    return req as Request;
  }

  function makeNext(): jest.Mock<void, []> {
    return jest.fn<void, []>();
  }

  it('sets req.userId when Authorization Bearer is valid', async () => {
    const verify = jest
      .fn<Promise<{ sub: string } | null>, [string]>()
      .mockResolvedValue({ sub: 'user-123' });
    const auth = { verify } as unknown as AuthService;

    const mw = new JwtAuthMiddleware(auth);
    const req = makeReq('Bearer abc.def.ghi');
    const next = makeNext();

    await mw.use(req, {} as Response, next);

    expect((req as Request & { userId?: string }).userId).toBe('user-123');
    expect(verify).toHaveBeenCalledWith('abc.def.ghi');
    expect(next).toHaveBeenCalled();
  });

  it('does not set userId for invalid token, still calls next', async () => {
    const verify = jest
      .fn<Promise<{ sub: string } | null>, [string]>()
      .mockResolvedValue(null);
    const auth = { verify } as unknown as AuthService;

    const mw = new JwtAuthMiddleware(auth);
    const req = makeReq('Bearer invalid.token');
    const next = makeNext();

    await mw.use(req, {} as Response, next);

    expect((req as Request & { userId?: string }).userId).toBeUndefined();
    expect(verify).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('ignores when Authorization header is missing, calls next', async () => {
    const verify = jest
      .fn<Promise<{ sub: string } | null>, [string]>()
      .mockResolvedValue({ sub: 'should-not-be-called' });
    const auth = { verify } as unknown as AuthService;

    const mw = new JwtAuthMiddleware(auth);
    const req = makeReq(undefined);
    const next = makeNext();

    await mw.use(req, {} as Response, next);

    expect(verify).not.toHaveBeenCalled();
    expect((req as Request & { userId?: string }).userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
