import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { CreateLandmarkDto } from './create-landmark.dto';

export class UpdateLandmarkDto extends PartialType(
  OmitType(CreateLandmarkDto, ['latitude', 'longitude'] as const),
) {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
