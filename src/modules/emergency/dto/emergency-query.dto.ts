import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EmergencyType, EmergencyStatus } from '@prisma/client';

export class EmergencyQueryDto {
  @IsOptional()
  @IsEnum(EmergencyType)
  type?: EmergencyType;

  @IsOptional()
  @IsEnum(EmergencyStatus)
  status?: EmergencyStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
