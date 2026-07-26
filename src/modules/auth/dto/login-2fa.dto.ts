import { IsString } from 'class-validator';

export class Login2faDto {
  @IsString()
  temporaryToken: string;

  @IsString()
  code: string;
}
