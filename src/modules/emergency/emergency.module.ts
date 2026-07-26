import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [EmergencyController],
  providers: [
    EmergencyService,
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class EmergencyModule {}
