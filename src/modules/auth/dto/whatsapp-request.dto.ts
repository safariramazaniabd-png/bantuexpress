import { IsString } from 'class-validator';

export class WhatsappRequestDto {
  @IsString()
  phone: string;
}
