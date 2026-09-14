import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { PackageSize } from '@prisma/client';

export class CreateDeliveryDto {
  @IsOptional()
  @IsEnum(PackageSize)
  packageSize?: PackageSize;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  pickupAddress: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  dropoffAddress: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng: number;
}
