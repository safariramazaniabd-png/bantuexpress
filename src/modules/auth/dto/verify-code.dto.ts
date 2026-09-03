import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ example: '123456', description: 'Code de vérification à 6 chiffres' })
  @IsString()
  @Length(6, 6)
  code: string;
}
