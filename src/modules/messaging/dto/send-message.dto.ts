import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
