import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  it('issueToken returns a JWT with sub=userId', async () => {
    const { token } = await service.issueToken('julio');
    expect(typeof token).toBe('string');

    const decoded = await jwt.verifyAsync<{ sub: string }>(token);
    expect(decoded.sub).toBe('julio');
  });

  it('verify returns payload for valid token and null for invalid', async () => {
    const { token } = await service.issueToken('maria');
    const ok = await service.verify(token);
    expect(ok?.sub).toBe('maria');

    const bad = await service.verify('not-a-real-token');
    expect(bad).toBeNull();
  });
});
