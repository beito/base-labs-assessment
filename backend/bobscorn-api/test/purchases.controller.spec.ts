import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { Response as SuperTestResponse } from 'supertest';
import type { Server } from 'http';

import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/rate-limit/rate-limit.providers';

describe('PurchasesController (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(null)
      .compile();

    app = moduleRef.createNestApplication();
    server = app.getHttpServer() as unknown as Server;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/buy returns 200 on first purchase and sets rate-limit headers', async () => {
    const res = await request(server)
      .post('/api/buy')
      .set('x-client-id', 'julio');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, totalBought: 1 });
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('POST /api/buy returns 429 on second purchase within a minute', async () => {
    await request(server).post('/api/buy').set('x-client-id', 'maria');
    const res = await request(server)
      .post('/api/buy')
      .set('x-client-id', 'maria');

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ ok: false });
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('Idempotency-Key: same 200 twice and does not consume extra token', async () => {
    const key = 'k1';
    const client = 'ana';

    const first = await request(server)
      .post('/api/buy')
      .set('x-client-id', client)
      .set('idempotency-key', key);

    const second = await request(server)
      .post('/api/buy')
      .set('x-client-id', client)
      .set('idempotency-key', key);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);

    const third = await request(server)
      .post('/api/buy')
      .set('x-client-id', client)
      .set('idempotency-key', 'another-key');

    expect(third.status).toBe(429);
  });

  it('GET /api/me returns accumulated total for the client', async () => {
    await request(server).post('/api/buy').set('x-client-id', 'pepe'); // 200
    const me = await request(server).get('/api/me').set('x-client-id', 'pepe');

    expect(me.status).toBe(200);
    expect(me.body).toEqual({ totalBought: 1 });
  });

  it('Accepts clientId via query param as documented', async () => {
    const ok = await request(server).post('/api/buy?clientId=query-user');
    expect(ok.status).toBe(200);
  });

  it('JWT flow: /auth/login then /api/buy with Authorization Bearer', async () => {
    const login: SuperTestResponse = await request(server)
      .post('/auth/login')
      .send({ email: 'jwt-user@example.com' });

    expect([200, 201]).toContain(login.status);

    const loginBody = login.body as Record<string, unknown>;
    const tokenField = loginBody['token'];
    expect(typeof tokenField).toBe('string');

    const token = String(tokenField);

    const buy: SuperTestResponse = await request(server)
      .post('/api/buy')
      .set('Authorization', `Bearer ${token}`);

    expect(buy.status).toBe(200);

    const buyBody = buy.body as Record<string, unknown>;
    expect(buyBody['ok']).toBe(true);
  });
});
