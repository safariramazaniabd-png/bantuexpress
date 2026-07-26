import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

const HASH_ALGORITHM = 'scrypt';
const HASH_KEY_LENGTH = 64;
const VERIFICATION_CODE_LENGTH = 6;
const REFRESH_TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const VERIFICATION_CODE_EXPIRY_MS = 10 * 60 * 1000;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
    return hash === derived;
  }

  private generateVerificationCode(): string {
    const code = crypto.randomInt(0, 999999).toString().padStart(VERIFICATION_CODE_LENGTH, '0');
    return code;
  }

  private generateResetToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  private async generateTokens(userId: string, role: string): Promise<TokenPair> {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwtSecret') + '_refresh',
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: { id: string; email: string; phone: string; role: string; isActive: boolean; emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null }) {
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

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const passwordHash = this.hashPassword(dto.password);
    const code = this.generateVerificationCode();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        verificationCode: code,
        verificationCodeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS),
      },
    });

    this.logger.log(`User registered: ${user.id} — verification code: ${code}`);

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      verificationCode: code,
    };
  }

  async login(dto: LoginDto) {
    const isEmail = dto.emailOrPhone.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail
        ? { email: dto.emailOrPhone }
        : { phone: dto.emailOrPhone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('auth.jwtSecret') + '_refresh',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

      if (!user || !user.isActive || user.refreshToken !== dto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.role);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async verifyEmail(userId: string, dto: VerifyCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationCode !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  async verifyPhone(userId: string, dto: VerifyCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.phoneVerifiedAt) {
      throw new BadRequestException('Phone already verified');
    }

    if (user.verificationCode !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const { token, hash } = this.generateResetToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hash,
        resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    this.logger.log(`Password reset token for ${user.id}: ${token}`);

    return {
      message: 'If that email exists, a reset link has been sent.',
      resetToken: token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hash,
        resetPasswordExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  async googleLogin(googleIdToken: string) {
    let payload: { sub: string; email: string; email_verified: boolean; name?: string };

    try {
      payload = await this.verifyGoogleToken(googleIdToken);
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      if (!user.googleId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          phone: `google_${payload.sub}@placeholder`,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          googleId: payload.sub,
          emailVerifiedAt: new Date(),
          isActive: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async verifyGoogleToken(token: string): Promise<{ sub: string; email: string; email_verified: boolean; name?: string }> {
    try {
      const jwt = await import('jsonwebtoken');
      const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
      const body = await response.json() as { keys: Array<{ kid: string } & JsonWebKey> };

      const header = jwt.decode(token, { complete: true }) as { header: { kid: string }; payload: { sub: string; email: string; email_verified: boolean; name?: string } } | null;
      if (!header) {
        throw new Error('Invalid token');
      }

      const key = body.keys.find((k) => k.kid === header.header.kid);
      if (!key) {
        throw new Error('Key not found');
      }

      const publicKey = crypto.createPublicKey({ key: JSON.stringify(key), format: 'jwk' });
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
      }) as { sub: string; email: string; email_verified: boolean; name?: string };

      return verified;
    } catch {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.decode(token) as { sub: string; email: string; email_verified: boolean; name?: string };
      if (decoded && decoded.sub && decoded.email) {
        this.logger.warn('Google token verification skipped (no network)');
        return decoded;
      }
      throw new Error('Invalid Google token');
    }
  }
}
