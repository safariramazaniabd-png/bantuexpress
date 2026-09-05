import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResendEmailProvider {
  private readonly logger = new Logger('ResendEmailProvider');
  private readonly fromEmail: string;
  private readonly apiKey: string | undefined;
  private client: any;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'no-reply@bantu-express.com';
  }

  private getClient() {
    if (!this.client) {
      if (!this.apiKey) {
        throw new ServiceUnavailableException(
          'Email service not configured. Set RESEND_API_KEY in your environment.',
        );
      }
      const { Resend } = require('resend');
      this.client = new Resend(this.apiKey);
    }
    return this.client;
  }

  async send(options: { to: string; subject: string; text?: string; html?: string }): Promise<void> {
    const client = this.getClient();

    const payload: Record<string, unknown> = {
      from: this.fromEmail,
      to: [options.to],
      subject: options.subject,
    };
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;

    await client.emails.send(payload);
    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}
