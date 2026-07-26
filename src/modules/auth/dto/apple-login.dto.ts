import { IsString } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;
}
