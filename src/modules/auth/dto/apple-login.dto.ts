import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AppleLoginDto {
  @ApiProperty({ description: 'Identity token Apple (JWT Sign in with Apple)' })
  @IsString()
  identityToken: string;
}
