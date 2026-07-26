import { IsNumber, IsOptional, IsString, Min, Max, MinLength } from 'class-validator';

export class CalculateRouteDto {
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
  @IsString()
  @MinLength(1)
  name?: string;
}
