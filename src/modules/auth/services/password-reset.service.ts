import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { SecurityService } from './security.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { hashPassword, verifyPassword } from '../../../common/crypto/password.util';
import { generateResetToken, hashRawToken } from '../../../common/crypto/otp.util';

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger('PasswordResetService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly securityService: SecurityService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const { token, hash } = generateResetToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hash,
        resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    this.logger.log(`Password reset token for ${user.id}: ${token}`);
    await this.emailService.sendPasswordReset(user.email, token);

    const response: Record<string, string> = {
      message: 'If that email exists, a reset link has been sent.',
    };

    if (process.env.NODE_ENV === 'development') {
      response.resetToken = token;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = hashRawToken(dto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hash,
        resetPasswordExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = hashPassword(dto.newPassword);

    await this.securityService.recordPassword(user.id, user.passwordHash);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.securityService.assertNotReused(userId, dto.newPassword);

    const passwordHash = hashPassword(dto.newPassword);

    await this.securityService.recordPassword(userId, user.passwordHash);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  }
}
