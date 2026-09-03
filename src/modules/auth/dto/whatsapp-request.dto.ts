import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsappRequestDto {
  @ApiProperty({ example: '+243901234567', description: 'Numéro de téléphone WhatsApp' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone: string;
}
