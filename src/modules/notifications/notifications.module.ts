import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { AfricasTalkingSmsProvider } from './providers/africastalking-sms.provider';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsService,
    ResendEmailProvider,
    AfricasTalkingSmsProvider,
    EmailService,
    SmsService,
  ],
  exports: [NotificationsService, EmailService, SmsService],
})
export class NotificationsModule {}
