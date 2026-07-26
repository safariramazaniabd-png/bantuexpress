import { IsOptional, IsDateString } from 'class-validator';

export class StatsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
