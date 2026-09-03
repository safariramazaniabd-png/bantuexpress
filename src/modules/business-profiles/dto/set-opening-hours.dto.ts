import { IsArray, ValidateNested, IsInt, IsString, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class OpeningHourEntry {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  open: string;

  @IsString()
  close: string;
}

export class SetOpeningHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @Type(() => OpeningHourEntry)
  hours: OpeningHourEntry[];
}
