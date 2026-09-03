import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { OAuthService } from '../services/oauth.service';
import { OtpService } from '../services/otp.service';
import { PrismaService } from '../../../database/prisma.service';
import { SmsService } from '../../notifications/sms.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockSmsService = {
  send: jest.fn().mockResolvedValue(undefined),
};

const mockOtpService = {
  create: jest.fn(async () => '123456'),
  verify: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'GOOGLE_CLIENT_ID') return 'google-client';
    if (key === 'APPLE_CLIENT_ID') return 'apple-client';
    if (key === 'FACEBOOK_APP_ID') return 'fb-app';
    if (key === 'FACEBOOK_APP_SECRET') return 'fb-secret';
    return undefined;
  }),
};

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsService, useValue: mockSmsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OtpService, useValue: mockOtpService },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  describe('whatsappRequest', () => {
    it('should generate code for existing user via OtpService', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const result = await service.whatsappRequest('+243901234567');

      expect(result.message).toBe('If that phone is registered, a code has been sent.');
      expect(mockOtpService.create).toHaveBeenCalledWith('+243901234567', 'SMS', 'WHATSAPP', 'user-1');
      expect(mockSmsService.send).toHaveBeenCalled();
    });

    it('should not reveal if phone does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.whatsappRequest('+243999999999');

      expect(result.message).toBe('If that phone is registered, a code has been sent.');
      expect(mockOtpService.create).not.toHaveBeenCalled();
    });
  });

  describe('whatsappVerify', () => {
    it('should verify and return userId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'INDIVIDUAL' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.whatsappVerify('+243901234567', '123456');

      expect(mockOtpService.verify).toHaveBeenCalledWith('+243901234567', 'WHATSAPP', '123456');
      expect(result.userId).toBe('user-1');
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.whatsappVerify('+243901234567', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('provider config guard', () => {
    it('google login without provider config throws ServiceUnavailableException', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return undefined;
        return 'google-client';
      });

      await expect(service.googleLogin('token')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
