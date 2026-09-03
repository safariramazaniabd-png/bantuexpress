import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faDto {
  @ApiProperty({ example: '123456', description: 'Code TOTP à 6 chiffres' })
  @IsString()
  token: string;
}
