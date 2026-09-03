import { Injectable, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';
import { OtpService } from './otp.service';
import { SecurityService } from './security.service';
import { RegisterDto } from '../dto/register.dto';
import { ACCOUNT_TYPE_TO_ROLE } from '../../../common/roles/role.util';
import { hashPassword } from '../../../common/crypto/password.util';
import { OtpChannel, OtpPurpose, UserRole } from '@prisma/client';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger('RegistrationService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly otpService: OtpService,
    private readonly securityService: SecurityService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });

    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    if (dto.accountType) {
      const accountRole = await this.prisma.role.findUnique({
        where: { slug: dto.accountType },
        select: { isPublic: true },
      });
      if (!accountRole?.isPublic) {
        throw new ForbiddenException(
          `Account type "${dto.accountType}" cannot be self-registered`,
        );
      }
    }

    const role = dto.accountType ? ACCOUNT_TYPE_TO_ROLE[dto.accountType] : UserRole.INDIVIDUAL;

    const passwordHash = hashPassword(dto.password);
    const emailCode = await this.otpService.create(dto.email, OtpChannel.EMAIL, OtpPurpose.VERIFY_EMAIL);
    const phoneCode = await this.otpService.create(dto.phone, OtpChannel.SMS, OtpPurpose.VERIFY_PHONE);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role,
        profile: {
          create: {
            firstName: dto.firstName ?? '',
            lastName: dto.lastName ?? '',
            languages: [],
            secondaryPhones: [],
            isPublic: true,
          },
        },
      },
      include: { profile: true },
    });

    await this.securityService.recordPassword(user.id, passwordHash);

    try {
      await this.emailService.sendVerificationCode(user.email, emailCode);
      await this.smsService.sendVerificationCode(user.phone, phoneCode);
    } catch {
      this.logger.warn('Email/SMS verification send failed during registration');
    }

    this.logger.log(`User registered: ${user.id}`);

    return user;
  }
}
