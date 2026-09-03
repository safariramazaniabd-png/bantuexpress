import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email ou numéro de téléphone' })
  @IsString()
  emailOrPhone: string;

  @ApiProperty({ example: 'Password1', description: 'Mot de passe' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
