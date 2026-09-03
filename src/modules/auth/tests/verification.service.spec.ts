import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { VerificationService } from '../services/verification.service';
import { OtpService } from '../services/otp.service';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockEmailService = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
};

const mockSmsService = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
};

const mockOtpService = {
  create: jest.fn(),
  verify: jest.fn().mockResolvedValue(undefined),
};

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockOtpService.verify.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: OtpService, useValue: mockOtpService },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  describe('verifyEmail', () => {
    it('should mark email verified when OTP is valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerifiedAt: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.verifyEmail('user-1', { code: '123456' });

      expect(mockOtpService.verify).toHaveBeenCalledWith(undefined, 'VERIFY_EMAIL', '123456');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw if already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerifiedAt: new Date(),
      });

      await expect(service.verifyEmail('user-1', { code: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('unknown', { code: '123456' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyPhone', () => {
    it('should mark phone verified when OTP is valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phoneVerifiedAt: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.verifyPhone('user-1', { code: '123456' });

      expect(mockOtpService.verify).toHaveBeenCalledWith(undefined, 'VERIFY_PHONE', '123456');
    });
  });

  describe('resendCode', () => {
    it('should create and send a new email code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
      });
      mockOtpService.create.mockResolvedValue('654321');

      const result = await service.resendCode('user-1', { target: 'email' });

      expect(result.message).toBe('Verification code sent');
      expect(mockOtpService.create).toHaveBeenCalledWith(
        'test@example.com',
        'EMAIL',
        'VERIFY_EMAIL',
        'user-1',
      );
      expect(mockEmailService.sendVerificationCode).toHaveBeenCalledWith('test@example.com', '654321');
    });

    it('should create and send a new phone code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: '+243901234567',
      });
      mockOtpService.create.mockResolvedValue('654321');

      await service.resendCode('user-1', { target: 'phone' });

      expect(mockOtpService.create).toHaveBeenCalledWith('+243901234567', 'SMS', 'VERIFY_PHONE', 'user-1');
      expect(mockSmsService.sendVerificationCode).toHaveBeenCalledWith('+243901234567', '654321');
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resendCode('unknown', {})).rejects.toThrow(UnauthorizedException);
    });
  });
});
