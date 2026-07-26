import { IsString } from 'class-validator';

export class FacebookLoginDto {
  @IsString()
  accessToken: string;
}
