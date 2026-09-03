import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResendCodeDto {
  @ApiPropertyOptional({ enum: ['email', 'phone'], default: 'email' })
  @IsIn(['email', 'phone'])
  @IsOptional()
  target?: 'email' | 'phone';
}
