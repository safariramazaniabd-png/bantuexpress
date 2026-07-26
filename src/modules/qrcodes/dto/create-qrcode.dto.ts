import { IsString, IsIn } from 'class-validator';

export class CreateQrCodeDto {
  @IsString()
  @IsIn(['profile', 'address', 'landmark'])
  entityType: 'profile' | 'address' | 'landmark';

  @IsString()
  entityId: string;
}
