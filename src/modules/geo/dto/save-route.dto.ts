import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SaveRouteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  polyline?: string;
}
