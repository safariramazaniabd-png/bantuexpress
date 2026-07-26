import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LandmarkCategory } from '@prisma/client';

export class MarkerQueryDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  swLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  swLng: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  neLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  neLng: number;

  @IsOptional()
  @IsEnum(LandmarkCategory)
  category?: LandmarkCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
