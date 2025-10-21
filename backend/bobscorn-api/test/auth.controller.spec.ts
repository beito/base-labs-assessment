import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let issueTokenMock: jest.Mock<Promise<{ token: string }>, [string]>;

  beforeEach(async () => {
    issueTokenMock = jest
      .fn<Promise<{ token: string }>, [string]>()
      .mockResolvedValue({ token: 'signed.jwt.token' });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { issueToken: issueTokenMock },
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('login trims and lowercases email, calls service and returns token', async () => {
    const res = await controller.login('  JULIO@Example.com  ');
    expect(issueTokenMock).toHaveBeenCalledWith('julio@example.com');
    expect(res).toEqual({ token: 'signed.jwt.token' });
  });

  it('login throws BadRequestException when email missing', async () => {
    await expect(controller.login('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.login(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
