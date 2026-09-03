import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { RegistrationService } from '../services/registration.service';
import { LoginService } from '../services/login.service';
import { TwoFactorService } from '../services/two-factor.service';
import { PasswordResetService } from '../services/password-reset.service';
import { VerificationService } from '../services/verification.service';
import { OAuthService } from '../services/oauth.service';
import { SessionService } from '../services/session.service';

const mockJwtTokenService = {
  generateTokens: jest.fn().mockResolvedValue({ accessToken: 'mock-token', refreshToken: 'mock-token' }),
  rotateRefreshToken: jest.fn(),
  revokeUserSessions: jest.fn(),
  decodeAccessToken: jest.fn(),
};

const mockRegistrationService = {
  register: jest.fn(),
};

const mockLoginService = {
  login: jest.fn(),
};

const mockTwoFactorService = {
  enable: jest.fn(),
  verify: jest.fn(),
  disable: jest.fn(),
  loginWith2fa: jest.fn(),
};

const mockPasswordResetService = {
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
};

const mockVerificationService = {
  verifyEmail: jest.fn(),
  verifyPhone: jest.fn(),
  resendCode: jest.fn(),
};

const mockOAuthService = {
  googleLogin: jest.fn(),
  appleLogin: jest.fn(),
  facebookLogin: jest.fn(),
  whatsappRequest: jest.fn(),
  whatsappVerify: jest.fn(),
};

const mockSessionService = {
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  revokeAll: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn(), findFirst: jest.fn() } } },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: RegistrationService, useValue: mockRegistrationService },
        { provide: LoginService, useValue: mockLoginService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
        { provide: PasswordResetService, useValue: mockPasswordResetService },
        { provide: VerificationService, useValue: mockVerificationService },
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create a user and return tokens', async () => {
      mockRegistrationService.register.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
        role: 'INDIVIDUAL',
        isActive: true,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
      });

      const result = await service.register({
        email: 'test@example.com',
        phone: '+243901234567',
        password: 'Password1',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(mockRegistrationService.register).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRegistrationService.register.mockRejectedValue(
        new ConflictException('Email or phone already registered'),
      );

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
    it('should login and return tokens', async () => {
      mockLoginService.login.mockResolvedValue({
        requires2fa: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          phone: '+243901234567',
          role: 'INDIVIDUAL',
          isActive: true,
          emailVerified: false,
          phoneVerified: false,
        },
      });

      const result = (await service.login({
        emailOrPhone: 'test@example.com',
        password: 'Password1',
      })) as { user: { email: string }; accessToken: string };

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-token');
    });

    it('should return requires2fa if enabled', async () => {
      mockLoginService.login.mockResolvedValue({
        requires2fa: true,
        temporaryToken: '2fa-token',
      });

      const result = (await service.login({
        emailOrPhone: 'test@example.com',
        password: 'Password1',
      })) as { requires2fa: true; temporaryToken: string };

      expect(result.requires2fa).toBe(true);
      expect(result.temporaryToken).toBe('2fa-token');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockLoginService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(
        service.login({
          emailOrPhone: 'test@example.com',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      mockJwtTokenService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      });
      mockJwtTokenService.decodeAccessToken.mockReturnValue({ sub: 'user-1', role: 'INDIVIDUAL' });

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('new-at');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtTokenService.rotateRefreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke user sessions', async () => {
      await service.logout('user-1');
      expect(mockJwtTokenService.revokeUserSessions).toHaveBeenCalledWith('user-1');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct code', async () => {
      mockVerificationService.verifyEmail.mockResolvedValue(undefined);
      await service.verifyEmail('user-1', { code: '123456' });
      expect(mockVerificationService.verifyEmail).toHaveBeenCalledWith('user-1', { code: '123456' });
    });
  });

  describe('forgotPassword', () => {
    it('should delegate to passwordResetService', async () => {
      mockPasswordResetService.forgotPassword.mockResolvedValue({
        message: 'If that email exists, a reset link has been sent.',
      });
      const result = await service.forgotPassword({ email: 'test@example.com' });
      expect(result.message).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should delegate to passwordResetService', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(undefined);
      await service.resetPassword({ token: 'valid', newPassword: 'NewPassword1' });
      expect(mockPasswordResetService.resetPassword).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user', async () => {
      const prismaMock = (service as any).prisma;
      prismaMock.user.findUnique.mockResolvedValue({
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
