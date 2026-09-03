import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtTokenService } from './services/jwt-token.service';
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { TwoFactorService } from './services/two-factor.service';
import { PasswordResetService } from './services/password-reset.service';
import { VerificationService } from './services/verification.service';
import { OAuthService } from './services/oauth.service';
import { SessionService } from './services/session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly registrationService: RegistrationService,
    private readonly loginService: LoginService,
    private readonly twoFactorService: TwoFactorService,
    private readonly passwordResetService: PasswordResetService,
    private readonly verificationService: VerificationService,
    private readonly oauthService: OAuthService,
    private readonly sessionService: SessionService,
  ) {}

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

  async register(dto: RegisterDto, deviceInfo?: { ip?: string; userAgent?: string }) {
    const user = await this.registrationService.register(dto);
    const tokens = await this.jwtTokenService.generateTokens(user.id, user.role, deviceInfo);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, deviceInfo?: { ip?: string; userAgent?: string }) {
    const result = await this.loginService.login(dto, deviceInfo);

    if (result.requires2fa) {
      return { requires2fa: true, temporaryToken: result.temporaryToken };
    }

    const tokens = await this.jwtTokenService.generateTokens(result.user.id, result.user.role, deviceInfo);
    return { user: result.user, ...tokens };
  }

  async refresh(dto: RefreshTokenDto, deviceInfo?: { ip?: string; userAgent?: string }) {
    const tokens = await this.jwtTokenService.rotateRefreshToken(dto.refreshToken, deviceInfo);
    const decoded = this.jwtTokenService.decodeAccessToken(tokens.accessToken);
    const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });

    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async logout(userId: string) {
    await this.jwtTokenService.revokeUserSessions(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async verifyEmail(userId: string, dto: VerifyCodeDto) {
    await this.verificationService.verifyEmail(userId, dto);
  }

  async verifyPhone(userId: string, dto: VerifyCodeDto) {
    await this.verificationService.verifyPhone(userId, dto);
  }

  async resendCode(userId: string, dto: ResendCodeDto) {
    return this.verificationService.resendCode(userId, dto);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.passwordResetService.changePassword(userId, dto);
    await this.jwtTokenService.revokeUserSessions(userId);
  }

  async googleLogin(idToken: string, deviceInfo?: { ip?: string; userAgent?: string }) {
    const { userId, role } = await this.oauthService.googleLogin(idToken);
    const tokens = await this.jwtTokenService.generateTokens(userId, role, deviceInfo);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async appleLogin(identityToken: string, deviceInfo?: { ip?: string; userAgent?: string }) {
    const { userId, role } = await this.oauthService.appleLogin(identityToken);
    const tokens = await this.jwtTokenService.generateTokens(userId, role, deviceInfo);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async facebookLogin(accessToken: string, deviceInfo?: { ip?: string; userAgent?: string }) {
    const { userId, role } = await this.oauthService.facebookLogin(accessToken);
    const tokens = await this.jwtTokenService.generateTokens(userId, role, deviceInfo);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async whatsappRequest(phone: string) {
    return this.oauthService.whatsappRequest(phone);
  }

  async whatsappVerify(phone: string, code: string, deviceInfo?: { ip?: string; userAgent?: string }) {
    const { userId, role } = await this.oauthService.whatsappVerify(phone, code);
    const tokens = await this.jwtTokenService.generateTokens(userId, role, deviceInfo);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async enable2fa(userId: string) {
    return this.twoFactorService.enable(userId);
  }

  async verify2fa(userId: string, token: string) {
    return this.twoFactorService.verify(userId, token);
  }

  async disable2fa(userId: string) {
    return this.twoFactorService.disable(userId);
  }

  async loginWith2fa(temporaryToken: string, code: string, deviceInfo?: { ip?: string; userAgent?: string }) {
    const { userId, role } = await this.twoFactorService.loginWith2fa(temporaryToken, code);
    const tokens = await this.jwtTokenService.generateTokens(userId, role, deviceInfo);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { user: user ? this.sanitizeUser(user) : null, ...tokens };
  }

  async getAccountTypes() {
    const roles = await this.prisma.role.findMany({
      where: { isPublic: true },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, description: true },
    });
    return roles;
  }

  async getSessions(userId: string) {
    return this.sessionService.listSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  async revokeAllSessions(userId: string) {
    return this.sessionService.revokeAll(userId);
  }
}
