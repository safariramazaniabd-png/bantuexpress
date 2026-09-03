import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import * as crypto from 'crypto';

const HASH_KEY_LENGTH = 64;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class LoginService {
  private readonly logger = new Logger('LoginService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
    return hash === derived;
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerifiedAt !== null,
      phoneVerified: user.phoneVerifiedAt !== null,
    };
  }

  private async recordLoginAttempt(
    userId: string,
    success: boolean,
    method: string,
    ipAddress?: string,
    userAgent?: string,
    failReason?: string,
  ) {
    await this.prisma.loginAttempt.create({
      data: { userId, success, method, ipAddress, userAgent, failReason },
    });
  }

  private async checkLockout(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    if (!user) return;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
  }

  private async handleFailedAttempt(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
      });
      this.logger.warn(`User ${userId} locked out due to ${MAX_FAILED_ATTEMPTS} failed attempts`);
    }
  }

  async login(dto: LoginDto, deviceInfo?: { ip?: string; userAgent?: string }) {
    const isEmail = dto.emailOrPhone.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: dto.emailOrPhone } : { phone: dto.emailOrPhone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.checkLockout(user.id);

    if (!this.verifyPassword(dto.password, user.passwordHash)) {
      await this.handleFailedAttempt(user.id);
      await this.recordLoginAttempt(
        user.id,
        false,
        'password',
        deviceInfo?.ip,
        deviceInfo?.userAgent,
        'wrong_password',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.recordLoginAttempt(
        user.id,
        false,
        'password',
        deviceInfo?.ip,
        deviceInfo?.userAgent,
        'account_deactivated',
      );
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.recordLoginAttempt(user.id, true, 'password', deviceInfo?.ip, deviceInfo?.userAgent);

    if (user.twoFactorEnabled) {
      const temporaryToken = this.jwtService.sign(
        { sub: user.id, step: '2fa' },
        { secret: this.configService.get<string>('auth.jwtSecret') + '_2fa', expiresIn: '5m' },
      );
      return { requires2fa: true as const, temporaryToken, user: null };
    }

    return { requires2fa: false as const, user: this.sanitizeUser(user) };
  }
}
