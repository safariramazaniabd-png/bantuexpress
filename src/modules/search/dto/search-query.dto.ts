import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  PEOPLE = 'people',
  LANDMARKS = 'landmarks',
  ADDRESSES = 'addresses',
  BUSINESSES = 'businesses',
  ALL = 'all',
}

export enum SearchSort {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  NAME = 'name',
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
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50_000)
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsEnum(SearchSort)
  sort?: SearchSort;

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

export class SuggestionQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number;
}
