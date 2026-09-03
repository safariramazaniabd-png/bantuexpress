import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SmsService } from '../sms.service';
import { AfricasTalkingSmsProvider } from '../providers/africastalking-sms.provider';

const mockAtProvider = {
  send: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'development',
    };
    return config[key];
  }),
};

describe('SmsService', () => {
  let service: SmsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAtProvider.send.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AfricasTalkingSmsProvider, useValue: mockAtProvider },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should try provider then succeed in dev on success', async () => {
    await service.send({ to: '+243901234567', text: 'Your code: 123456' });
    expect(mockAtProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should fall back to log in dev when provider fails', async () => {
    mockAtProvider.send.mockRejectedValue(new ServiceUnavailableException('not configured'));

    await service.send({ to: '+243901234567', text: 'Your code: 123456' });
    expect(mockAtProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should send verification code SMS', async () => {
    await service.sendVerificationCode('+243901234567', '123456');
    expect(mockAtProvider.send).toHaveBeenCalledTimes(1);
    expect(mockAtProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+243901234567' }),
    );
  });
});
