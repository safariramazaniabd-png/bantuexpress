import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { IdentityDocumentType } from '@prisma/client';

export class CreateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

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
