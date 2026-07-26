import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { AddressType } from '@prisma/client';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  avenue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  quartier?: string;

  @IsString()
  @MaxLength(200)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
