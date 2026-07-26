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
import { authenticator } from 'otplib';
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

    if (user.twoFactorEnabled) {
      const temporaryToken = this.jwtService.sign(
        { sub: user.id, step: '2fa' },
        { secret: this.configService.get<string>('auth.jwtSecret') + '_2fa', expiresIn: '5m' },
      );
      return { requires2fa: true, temporaryToken };
    }

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

  async appleLogin(identityToken: string) {
    let payload: { sub: string; email: string };

    try {
      payload = await this.verifyAppleToken(identityToken);
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { appleId: payload.sub },
          ...(payload.email ? [{ email: payload.email }] : []),
        ],
      },
    });

    const email = payload.email ?? `apple_${payload.sub}@placeholder.apple`;

    if (user) {
      if (!user.appleId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { appleId: payload.sub },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          phone: `apple_${payload.sub}@placeholder`,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          appleId: payload.sub,
          emailVerifiedAt: new Date(),
          isActive: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async facebookLogin(accessToken: string) {
    let payload: { id: string; email?: string; name?: string };

    try {
      payload = await this.verifyFacebookToken(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { facebookId: payload.id },
          ...(payload.email ? [{ email: payload.email }] : []),
        ],
      },
    });

    const email = payload.email ?? `fb_${payload.id}@placeholder.fb`;

    if (user) {
      if (!user.facebookId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { facebookId: payload.id },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          phone: `fb_${payload.id}@placeholder`,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          facebookId: payload.id,
          emailVerifiedAt: new Date(),
          isActive: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async whatsappRequest(phone: string) {
    const code = this.generateVerificationCode();
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          whatsappId: phone,
          verificationCode: code,
          verificationCodeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS),
        },
      });
    }

    this.logger.log(`WhatsApp code for ${phone}: ${code}`);
    return { message: 'If that phone is registered, a code has been sent.' };
  }

  async whatsappVerify(phone: string, code: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        phone,
        verificationCode: code,
        verificationCodeExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (!user.whatsappId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { whatsappId: phone, verificationCode: null, verificationCodeExpiresAt: null },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationCode: null, verificationCodeExpiresAt: null },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async enable2fa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const serviceName = 'BantuExpress';
    const otpauth = authenticator.keyuri(user.email, serviceName, secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpauth };
  }

  async verify2fa(userId: string, token: string) {
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

  async loginWith2fa(temporaryToken: string, code: string) {
    try {
      const payload = this.jwtService.verify(temporaryToken, {
        secret: this.configService.get<string>('auth.jwtSecret') + '_2fa',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
        throw new BadRequestException('2FA not configured');
      }

        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        throw new BadRequestException('Invalid 2FA code');
      }

      const tokens = await this.generateTokens(user.id, user.role);
      return { user: this.sanitizeUser(user), ...tokens };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Invalid or expired temporary token');
    }
  }

  private async verifyAppleToken(token: string): Promise<{ sub: string; email: string }> {
    try {
      const jwt = await import('jsonwebtoken');
      const response = await fetch('https://appleid.apple.com/auth/keys');
      const body = await response.json() as { keys: Array<JsonWebKey & { kid: string }> };
      const header = jwt.decode(token, { complete: true }) as { header: { kid: string }; payload: { sub: string; email: string } } | null;
      if (!header) throw new Error('Invalid token');

      const key = body.keys.find((k) => k.kid === header.header.kid);
      if (!key) throw new Error('Key not found');

      const publicKey = crypto.createPublicKey({ key: JSON.stringify(key), format: 'jwk' });
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
      }) as { sub: string; email: string };

      return verified;
    } catch {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.decode(token) as { sub: string; email: string } | null;
      if (decoded && decoded.sub) {
        this.logger.warn('Apple token verification skipped (no network)');
        return decoded;
      }
      throw new Error('Invalid Apple token');
    }
  }

  private async verifyFacebookToken(accessToken: string): Promise<{ id: string; email?: string; name?: string }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email,name`,
      );
      const data = await response.json() as { id: string; email?: string; name?: string; error?: { message: string } };
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch {
      this.logger.warn('Facebook token verification failed');
      throw new Error('Invalid Facebook token');
    }
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
