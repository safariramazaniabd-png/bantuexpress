import { IsString } from 'class-validator';

export class QrCodeQueryDto {
  @IsString()
  code: string;
}
