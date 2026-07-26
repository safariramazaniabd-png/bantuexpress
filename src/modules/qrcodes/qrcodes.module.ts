import { Module } from '@nestjs/common';
import { QrCodesController } from './qrcodes.controller';
import { QrCodesService } from './qrcodes.service';

@Module({
  controllers: [QrCodesController],
  providers: [QrCodesService],
})
export class QrCodesModule {}
