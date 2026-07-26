import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
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
    if (key === 'auth.jwtExpiration') return '3600s';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create a user and return tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
        role: 'INDIVIDUAL',
        isActive: true,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        phone: '+243901234567',
        password: 'Password1',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.verificationCode).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'test@example.com',
          phone: '+243901234567',
          password: 'Password1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      phone: '+243901234567',
      passwordHash: '',
      role: 'INDIVIDUAL',
      isActive: true,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
    };

    beforeEach(() => {
      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('Password1', salt, 64).toString('hex');
      mockUser.passwordHash = `${salt}:${hash}`;
    });

    it('should login with email and return tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.login({
        emailOrPhone: 'test@example.com',
        password: 'Password1',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-token');
    });

    it('should login with phone and return tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.login({
        emailOrPhone: '+243901234567',
        password: 'Password1',
      });

      expect(result.user.phone).toBe('+243901234567');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({
          emailOrPhone: 'test@example.com',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({
          emailOrPhone: 'test@example.com',
          password: 'Password1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          emailOrPhone: 'unknown@example.com',
          password: 'Password1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', role: 'INDIVIDUAL' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
        role: 'INDIVIDUAL',
        isActive: true,
        refreshToken: 'valid-refresh-token',
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
      });

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error(); });

      await expect(
        service.refresh({ refreshToken: 'invalid' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.logout('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { refreshToken: null },
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerifiedAt: null,
        verificationCode: '123456',
        verificationCodeExpiresAt: new Date(Date.now() + 60000),
      });

      await service.verifyEmail('user-1', { code: '123456' });

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw if already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerifiedAt: new Date(),
        verificationCode: '123456',
        verificationCodeExpiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        service.verifyEmail('user-1', { code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if code is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerifiedAt: null,
        verificationCode: '123456',
        verificationCodeExpiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        service.verifyEmail('user-1', { code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should generate a reset token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result.resetToken).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should not reveal if email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(result.message).toBeDefined();
      expect((result as any).resetToken).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      await service.resetPassword({ token, newPassword: 'NewPassword1' });

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw for invalid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'NewPassword1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
        role: 'INDIVIDUAL',
        isActive: true,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: null,
      });

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
        role: 'INDIVIDUAL',
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
      });
    });
  });
});
