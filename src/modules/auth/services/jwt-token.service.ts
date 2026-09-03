import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger('JwtTokenService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private generateJti(): string {
    return crypto.randomUUID();
  }

  async generateTokens(
    userId: string,
    role: string,
    deviceInfo?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const jti = this.generateJti();
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { ...payload, jti },
      {
        secret: this.configService.get<string>('auth.jwtSecret') + '_refresh',
        expiresIn: '7d',
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prisma.refreshTokenSession.create({
      data: {
        userId,
        jti,
        expiresAt,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenJti: jti },
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    deviceInfo?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get<string>('auth.jwtSecret') + '_refresh',
      }) as { sub: string; role: string; jti: string };

      const session = await this.prisma.refreshTokenSession.findUnique({
        where: { jti: payload.jti },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.refreshTokenSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Account inactive or not found');
      }

      return this.generateTokens(payload.sub, payload.role, deviceInfo);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn('Refresh token rotation failed');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenJti: null },
    });
  }

  async revokeSessionByJti(jti: string): Promise<void> {
    await this.prisma.refreshTokenSession.updateMany({
      where: { jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  decodeAccessToken(token: string): { sub: string; role: string } {
    return this.jwtService.decode(token) as { sub: string; role: string };
  }
}
