import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AfricasTalkingSmsProvider {
  private readonly logger = new Logger('AfricasTalkingSmsProvider');
  private readonly apiKey: string | undefined;
  private readonly username: string;
  private readonly senderId: string;
  private sms: any;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AT_API_KEY');
    this.username = this.configService.get<string>('AT_USERNAME') || 'sandbox';
    this.senderId = this.configService.get<string>('AT_SENDER_ID') || 'BANTU';
  }

  private getSmsClient() {
    if (!this.sms) {
      if (!this.apiKey) {
        throw new ServiceUnavailableException(
          'SMS service not configured. Set AT_API_KEY in your environment.',
        );
      }
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({
        apiKey: this.apiKey,
        username: this.username,
      });
      this.sms = at.SMS;
    }
    return this.sms;
  }

  async send(options: { to: string; text: string }): Promise<void> {
    const sms = this.getSmsClient();

    const result = await sms.send({
      to: [options.to],
      message: options.text,
      from: this.senderId,
    });
    this.logger.log(`SMS sent to ${options.to}`);
    this.logger.debug(`AT response: ${JSON.stringify(result)}`);
  }
}
