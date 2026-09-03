import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';
import { OtpService } from './otp.service';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResendCodeDto } from '../dto/resend-code.dto';
import { OtpChannel, OtpPurpose } from '@prisma/client';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger('VerificationService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly otpService: OtpService,
  ) {}

  async verifyEmail(userId: string, dto: VerifyCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.emailVerifiedAt) throw new BadRequestException('Email already verified');

    await this.otpService.verify(user.email, OtpPurpose.VERIFY_EMAIL, dto.code);

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async verifyPhone(userId: string, dto: VerifyCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.phoneVerifiedAt) throw new BadRequestException('Phone already verified');

    await this.otpService.verify(user.phone, OtpPurpose.VERIFY_PHONE, dto.code);

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() },
    });
  }

  async resendCode(userId: string, dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const target = dto.target ?? 'email';

    if (target === 'phone') {
      const code = await this.otpService.create(user.phone, OtpChannel.SMS, OtpPurpose.VERIFY_PHONE, userId);
      await this.smsService.sendVerificationCode(user.phone, code);
    } else {
      const code = await this.otpService.create(
        user.email,
        OtpChannel.EMAIL,
        OtpPurpose.VERIFY_EMAIL,
        userId,
      );
      await this.emailService.sendVerificationCode(user.email, code);
    }

    return { message: 'Verification code sent' };
  }
}
