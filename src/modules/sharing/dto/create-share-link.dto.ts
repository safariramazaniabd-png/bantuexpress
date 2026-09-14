import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export const SHARE_ENTITY_TYPES = ['address', 'landmark', 'business', 'profile'] as const;

export class CreateShareLinkDto {
  @IsString()
  @IsIn(SHARE_ENTITY_TYPES)
  entityType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  entityId: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
