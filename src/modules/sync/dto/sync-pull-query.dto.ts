import { Type } from 'class-transformer';
import { IsISO8601, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SYNC_ENTITY_TYPES } from './sync.constants';

export class SyncPullQueryDto {
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'since must be a valid ISO 8601 date' })
  since?: string;

  @IsOptional()
  @IsIn(SYNC_ENTITY_TYPES, { message: 'entityType must be one of addresses, landmarks, business-profiles, qrcodes' })
  entityType?: string;

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