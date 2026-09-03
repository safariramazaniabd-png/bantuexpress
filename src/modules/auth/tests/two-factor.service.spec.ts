import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { TwoFactorService } from '../services/two-factor.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'auth.jwtSecret') return 'test-secret';
    return null;
  }),
};

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  describe('enable', () => {
    it('should generate a secret and otpauth URL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.enable('user-1');

      expect(result.secret).toBeDefined();
      expect(result.otpauth).toContain('otpauth://');
      expect(result.otpauth).toContain('test%40example.com');
    });

    it('should throw for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.enable('user-1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verify', () => {
    it('should enable 2fa with valid token', async () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verify('user-1', token);

      expect(result.message).toBe('2FA enabled successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { twoFactorEnabled: true },
        }),
      );
    });

    it('should throw if 2fa not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', twoFactorSecret: null });

      await expect(service.verify('user-1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('should throw for invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorSecret: authenticator.generateSecret(),
      });

      await expect(service.verify('user-1', '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable', () => {
    it('should disable 2fa', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.disable('user-1');

      expect(result.message).toBe('2FA disabled successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { twoFactorSecret: null, twoFactorEnabled: false },
        }),
      );
    });
  });

  describe('loginWith2fa', () => {
    it('should complete 2fa login with valid code', async () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);

      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      });

      const result = await service.loginWith2fa('tmp-token', token);

      expect(result.userId).toBe('user-1');
    });

    it('should throw with invalid 2fa code', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorSecret: authenticator.generateSecret(),
        twoFactorEnabled: true,
      });

      await expect(service.loginWith2fa('tmp-token', '000000')).rejects.toThrow(BadRequestException);
    });
  });
});
