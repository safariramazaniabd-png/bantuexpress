import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RegistrationService } from '../services/registration.service';
import { OtpService } from '../services/otp.service';
import { SecurityService } from '../services/security.service';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
};

const mockEmailService = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
};

const mockSmsService = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
};

const mockOtpService = {
  create: jest.fn(async () => '123456'),
};

const mockSecurityService = {
  recordPassword: jest.fn().mockResolvedValue(undefined),
};

describe('RegistrationService', () => {
  let service: RegistrationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
  });

  it('should register a new user', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
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

    expect(result.email).toBe('test@example.com');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'test@example.com',
          phone: '+243901234567',
          role: 'INDIVIDUAL',
        }),
      }),
    );
  });

  it('should apply the account type role', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ isPublic: true });
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      role: 'COURIER',
    });

    await service.register({
      email: 'test@example.com',
      phone: '+243901234567',
      password: 'Password1',
      accountType: 'livreur',
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'COURIER' }) }),
    );
  });

  it('should reject a non-public account type', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ isPublic: false });

    await expect(
      service.register({
        email: 'test@example.com',
        phone: '+243901234567',
        password: 'Password1',
        accountType: 'police',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should never allow self-registration as administration', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'admin@example.com',
        phone: '+243901234567',
        password: 'Password1',
        accountType: 'administration',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.role.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if email or phone exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({
        email: 'test@example.com',
        phone: '+243901234567',
        password: 'Password1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should hash the password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

    await service.register({
      email: 'test@example.com',
      phone: '+243901234567',
      password: 'Password1',
    });

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toContain(':');
    expect(createCall.data.passwordHash.split(':')[1]).toHaveLength(128);
  });

  it('should create a profile with firstName and lastName', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });

    await service.register({
      email: 'test@example.com',
      phone: '+243901234567',
      password: 'Password1',
      firstName: 'Jean',
      lastName: 'Dupont',
    });

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.profile.create.firstName).toBe('Jean');
    expect(createCall.data.profile.create.lastName).toBe('Dupont');
  });

  it('should generate OTP codes for email and phone and record password history', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      phone: '+243901234567',
    });

    await service.register({
      email: 'test@example.com',
      phone: '+243901234567',
      password: 'Password1',
    });

    expect(mockOtpService.create).toHaveBeenCalledTimes(2);
    expect(mockEmailService.sendVerificationCode).toHaveBeenCalledWith('test@example.com', '123456');
    expect(mockSmsService.sendVerificationCode).toHaveBeenCalledWith('+243901234567', '123456');
    expect(mockSecurityService.recordPassword).toHaveBeenCalledTimes(1);
  });
});
