import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateShareLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  entityType: string;

  @IsString()
  @MinLength(1)
  entityId: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
