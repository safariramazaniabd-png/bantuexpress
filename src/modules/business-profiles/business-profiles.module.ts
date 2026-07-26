import { Module } from '@nestjs/common';
import { BusinessProfilesController } from './business-profiles.controller';
import { BusinessProfilesService } from './business-profiles.service';

@Module({
  controllers: [BusinessProfilesController],
  providers: [BusinessProfilesService],
})
export class BusinessProfilesModule {}
