import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
  MinLength,
} from 'class-validator';
import { BusinessType } from '@prisma/client';

export class CreateBusinessProfileDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
