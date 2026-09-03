import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AfricasTalkingSmsProvider } from './providers/africastalking-sms.provider';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly atProvider: AfricasTalkingSmsProvider,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  async send(options: { to: string; text: string }): Promise<void> {
    if (this.isProduction) {
      await this.atProvider.send(options);
      return;
    }

    try {
      await this.atProvider.send(options);
    } catch {
      this.logger.warn(`[DEV] SMS to ${options.to}: ${options.text}`);
    }
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await this.send({
      to: phone,
      text: `Your BantuExpress code: ${code}. Expires in 10 minutes.`,
    });
  }
}
