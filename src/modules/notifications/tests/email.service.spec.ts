import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from '../email.service';
import { ResendEmailProvider } from '../providers/resend-email.provider';

const mockResendProvider = {
  send: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3001',
    };
    return config[key];
  }),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockResendProvider.send.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ResendEmailProvider, useValue: mockResendProvider },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should try provider then log in dev on success', async () => {
    await service.send({ to: 'test@example.com', subject: 'Test', text: 'Hello' });
    expect(mockResendProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should fall back to log in dev when provider fails', async () => {
    mockResendProvider.send.mockRejectedValue(new ServiceUnavailableException('not configured'));

    await service.send({ to: 'test@example.com', subject: 'Test', text: 'Hello' });
    expect(mockResendProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should send verification code email', async () => {
    await service.sendVerificationCode('test@example.com', '123456');
    expect(mockResendProvider.send).toHaveBeenCalledTimes(1);
    expect(mockResendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' }),
    );
  });

  it('should send password reset email', async () => {
    await service.sendPasswordReset('test@example.com', 'reset-token');
    expect(mockResendProvider.send).toHaveBeenCalledTimes(1);
    expect(mockResendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' }),
    );
  });
});
