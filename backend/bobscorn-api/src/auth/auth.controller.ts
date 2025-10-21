import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Login (stateless) - returns JWT with sub=userId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string', example: 'julio@example.com' } },
      required: ['email'],
    },
  })
  @Post('login')
  async login(@Body('email') email?: string) {
    const user = (email ?? '').trim();
    if (!user) throw new BadRequestException('missing_email');
    return this.auth.issueToken(user.toLowerCase());
  }
}