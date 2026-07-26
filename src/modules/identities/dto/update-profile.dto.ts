import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { IdentityDocumentType } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  profession?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  secondaryPhones?: string[];

  @IsOptional()
  @IsEnum(IdentityDocumentType)
  identityDocumentType?: IdentityDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  identityDocumentNumber?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
