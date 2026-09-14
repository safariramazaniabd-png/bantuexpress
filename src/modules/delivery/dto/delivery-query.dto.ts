import { IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '@prisma/client';

export const DELIVERY_QUERY_ROLES = ['client', 'courier'] as const;
export type DeliveryQueryRole = (typeof DELIVERY_QUERY_ROLES)[number];

export class DeliveryQueryDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsIn(DELIVERY_QUERY_ROLES)
  role?: DeliveryQueryRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}