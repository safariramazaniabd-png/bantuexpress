import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async enable(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'BantuExpress', secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpauth };
  }

  async verify(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not enabled');
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA enabled successfully' };
  }

  async disable(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });

    return { message: '2FA disabled successfully' };
  }

  async loginWith2fa(temporaryToken: string, code: string) {
    try {
      const payload = this.jwtService.verify(temporaryToken, {
        secret: this.configService.get<string>('auth.jwtSecret') + '_2fa',
      }) as { sub: string };

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
        throw new BadRequestException('2FA not configured');
      }

      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        throw new BadRequestException('Invalid 2FA code');
      }

      return { userId: user.id, role: user.role };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Invalid or expired temporary token');
    }
  }
}
