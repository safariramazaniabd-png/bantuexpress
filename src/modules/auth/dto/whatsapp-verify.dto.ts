import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsappVerifyDto {
  @ApiProperty({ example: '+243901234567', description: 'Numéro de téléphone WhatsApp' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone: string;

  @ApiProperty({ example: '123456', description: 'Code de vérification à 6 chiffres' })
  @IsString()
  @Length(6, 6)
  code: string;
}
