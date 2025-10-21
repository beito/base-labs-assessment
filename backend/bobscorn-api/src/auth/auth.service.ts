import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async issueToken(userId: string) {
    const payload = { sub: userId };
    const token = await this.jwt.signAsync(payload);
    return { token };
  }

  async verify(token: string): Promise<{ sub: string } | null> {
    try {
      return await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      return null;
    }
  }
}
