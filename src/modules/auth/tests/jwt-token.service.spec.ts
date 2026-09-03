import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../services/jwt-token.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshTokenSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'auth.jwtSecret') return 'test-secret';
    return null;
  }),
};

describe('JwtTokenService', () => {
  let service: JwtTokenService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.sign.mockReturnValue('mock-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 });
      mockPrisma.refreshTokenSession.create.mockResolvedValue({ id: 'session-1' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.generateTokens('user-1', 'INDIVIDUAL');

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(mockPrisma.refreshTokenSession.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should include device info in session', async () => {
      mockJwtService.sign.mockReturnValue('mock-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 });
      mockPrisma.refreshTokenSession.create.mockResolvedValue({ id: 'session-1' });

      await service.generateTokens('user-1', 'INDIVIDUAL', { ip: '127.0.0.1', userAgent: 'test-agent' });

      const createCall = mockPrisma.refreshTokenSession.create.mock.calls[0][0];
      expect(createCall.data.ipAddress).toBe('127.0.0.1');
      expect(createCall.data.userAgent).toBe('test-agent');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate a valid refresh token', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', role: 'INDIVIDUAL', jti: 'jti-1' });
      mockJwtService.sign.mockReturnValue('new-token');
      mockJwtService.decode.mockReturnValue({ exp: now + 86400 });
      mockPrisma.refreshTokenSession.findUnique.mockResolvedValue({
        id: 'session-1',
        jti: 'jti-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.refreshTokenSession.update.mockResolvedValue({});
      mockPrisma.refreshTokenSession.create.mockResolvedValue({ id: 'session-2' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: true });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.rotateRefreshToken('old-token');

      expect(result.accessToken).toBe('new-token');
      expect(mockPrisma.refreshTokenSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw if session is revoked', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'jti-1' });
      mockPrisma.refreshTokenSession.findUnique.mockResolvedValue({
        id: 'session-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.rotateRefreshToken('old-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(service.rotateRefreshToken('invalid')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockPrisma.refreshTokenSession.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.user.update.mockResolvedValue({});

      await service.revokeUserSessions('user-1');

      expect(mockPrisma.refreshTokenSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
        }),
      );
    });
  });
});
