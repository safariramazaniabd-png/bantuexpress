import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ReviewReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
