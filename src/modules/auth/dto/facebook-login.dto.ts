import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FacebookLoginDto {
  @ApiProperty({ description: 'Access token Facebook Graph API' })
  @IsString()
  accessToken: string;
}
