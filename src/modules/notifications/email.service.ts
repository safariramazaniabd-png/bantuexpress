import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly resendProvider: ResendEmailProvider,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  async send(options: { to: string; subject: string; text?: string; html?: string }): Promise<void> {
    if (this.isProduction) {
      await this.resendProvider.send(options);
      return;
    }

    try {
      await this.resendProvider.send(options);
    } catch {
      this.logger.warn(`[DEV] Email to ${options.to}: ${options.subject}`);
      if (options.text) this.logger.warn(`[DEV] Body: ${options.text}`);
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your BantuExpress verification code',
      text: `Your verification code is: ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'}/reset-password?token=${token}`;
    await this.send({
      to: email,
      subject: 'Reset your BantuExpress password',
      text: `Click here to reset your password: ${resetUrl}. This link expires in 15 minutes.`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
    });
  }
}
