import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
} from '../../../common/crypto/otp.util';
import { OtpChannel, OtpPurpose } from '@prisma/client';

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OtpService');

  constructor(private readonly prisma: PrismaService) {}

  private normalizeIdentifier(identifier: string): string {
    return identifier.trim().toLowerCase();
  }

  /**
   * Crée un nouveau code OTP pour un identifiant (email ou téléphone) et une
   * finalité donnés. Les codes précédents non consommés de même finalité sont
   * invalidés. Retourne le code PLAIN (uniquement destiné à être délivré au
   * canal concerné ; seul le hash est persisté).
   */
  async create(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    userId?: string,
  ): Promise<string> {
    const normalized = this.normalizeIdentifier(identifier);
    const code = generateOtpCode();

    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { identifier: normalized, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: {
          userId,
          identifier: normalized,
          channel,
          purpose,
          codeHash: hashOtpCode(code),
          maxAttempts: OTP_MAX_ATTEMPTS,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        },
      }),
    ]);

    return code;
  }

  /**
   * Vérifie un code OTP. Incrémente le compteur d'essais à chaque échec,
   * consomme le code en cas de succès, et lève BadRequestException si le
   * code est invalide, expiré ou si le nombre max d'essais est dépassé.
   */
  async verify(identifier: string, purpose: OtpPurpose, code: string): Promise<void> {
    const normalized = this.normalizeIdentifier(identifier);
    const record = await this.prisma.otpCode.findFirst({
      where: { identifier: normalized, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (record.expiresAt < new Date()) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestException('Verification code expired');
    }

    if (record.attempts >= record.maxAttempts) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    const valid = hashOtpCode(code) === record.codeHash;
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }
}
