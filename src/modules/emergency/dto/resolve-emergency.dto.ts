import { IsOptional, IsString } from 'class-validator';

export class ResolveEmergencyDto {
  @IsOptional()
  @IsString()
  resolvedNotes?: string;
}
