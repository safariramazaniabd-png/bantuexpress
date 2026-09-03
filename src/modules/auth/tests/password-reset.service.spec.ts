import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PasswordResetService } from '../services/password-reset.service';
import { SecurityService } from '../services/security.service';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import * as crypto from 'crypto';

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockEmailService = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

const mockSecurityService = {
  recordPassword: jest.fn().mockResolvedValue(undefined),
  assertNotReused: jest.fn().mockResolvedValue(undefined),
};

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword', () => {
    it('should generate a reset token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result.message).toBeDefined();
    });

    it('should return generic message for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(result.message).toBe('If that email exists, a reset link has been sent.');
    });

    it('should expose reset token in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result.resetToken).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose reset token in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect((result as any).resetToken).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword({ token, newPassword: 'NewPassword1' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            passwordChangedAt: expect.any(Date),
            resetPasswordToken: null,
          }),
        }),
      );
    });

    it('should throw for invalid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'invalid', newPassword: 'NewPassword1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should hash the new password', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword({ token, newPassword: 'NewPassword1' });

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).toContain(':');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const passwordHash = hashPassword('OldPassword1');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.changePassword('user-1', {
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword1',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            passwordChangedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw if current password is wrong', async () => {
      const passwordHash = hashPassword('CorrectPassword1');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });

      await expect(
        service.changePassword('user-1', { currentPassword: 'WrongPassword1', newPassword: 'NewPassword1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', { currentPassword: 'Old', newPassword: 'NewPassword1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
