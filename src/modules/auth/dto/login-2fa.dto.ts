import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Login2faDto {
  @ApiProperty({ description: 'Token temporaire reçu après login (step 2fa)' })
  @IsString()
  temporaryToken: string;

  @ApiProperty({ example: '123456', description: 'Code TOTP à 6 chiffres' })
  @IsString()
  @Length(6, 6)
  code: string;
}
