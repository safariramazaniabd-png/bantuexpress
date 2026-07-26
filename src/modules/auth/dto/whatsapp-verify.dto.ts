import { IsString } from 'class-validator';

export class WhatsappVerifyDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;
}
