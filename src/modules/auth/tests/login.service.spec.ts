import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginService } from '../services/login.service';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  loginAttempt: {
    create: jest.fn(),
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

describe('LoginService', () => {
  let service: LoginService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+243901234567',
    passwordHash: '',
    role: 'INDIVIDUAL',
    isActive: true,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(() => {
    mockUser.passwordHash = hashPassword('Password1');
  });

  it('should login with valid email and password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    const result = await service.login({ emailOrPhone: 'test@example.com', password: 'Password1' });

    expect(result.requires2fa).toBe(false);
    if (!result.requires2fa) {
      expect(result.user.email).toBe('test@example.com');
    }
  });

  it('should login with valid phone and password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    const result = await service.login({ emailOrPhone: '+243901234567', password: 'Password1' });

    expect(result.requires2fa).toBe(false);
  });

  it('should throw for wrong password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    await expect(
      service.login({ emailOrPhone: 'test@example.com', password: 'WrongPassword1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw for inactive account', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, isActive: false });
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    await expect(service.login({ emailOrPhone: 'test@example.com', password: 'Password1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw for non-existent user', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.login({ emailOrPhone: 'unknown@example.com', password: 'Password1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should require 2fa if enabled', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...mockUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    const result = await service.login({ emailOrPhone: 'test@example.com', password: 'Password1' });

    expect(result.requires2fa).toBe(true);
    if (result.requires2fa) {
      expect(result.temporaryToken).toBe('mock-token');
    }
  });

  it('should lock account after 5 failed attempts', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update
      .mockResolvedValueOnce({ ...mockUser, failedLoginAttempts: 5 })
      .mockResolvedValueOnce({ ...mockUser, lockedUntil: new Date(Date.now() + 900000) });
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    await expect(
      service.login({ emailOrPhone: 'test@example.com', password: 'WrongPassword1' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ lockedUntil: expect.any(Date) }),
      }),
    );
  });

  it('should record login attempt', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.loginAttempt.create.mockResolvedValue({});

    await service.login({ emailOrPhone: 'test@example.com', password: 'Password1' });

    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          success: true,
          method: 'password',
        }),
      }),
    );
  });
});
