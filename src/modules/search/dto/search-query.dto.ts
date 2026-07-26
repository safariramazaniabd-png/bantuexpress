import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LandmarkCategory } from '@prisma/client';

export enum SearchType {
  PEOPLE = 'people',
  LANDMARKS = 'landmarks',
  ADDRESSES = 'addresses',
  ALL = 'all',
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsEnum(LandmarkCategory)
  category?: LandmarkCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
