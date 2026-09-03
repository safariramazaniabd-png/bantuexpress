import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ACCOUNT_TYPES = [
  'individual',
  'entreprise',
  'administration',
  'ong',
  'livreur',
  'transporteur',
  'agence-livraison',
  'urgence',
  'police',
  'pompiers',
  'ambulance',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Adresse email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+243901234567', description: 'Numéro de téléphone international' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid international phone number' })
  phone: string;

  @ApiProperty({ example: 'Password1', description: 'Mot de passe (min 8 car., maj, min, chiffre)' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain uppercase, lowercase, and a number',
  })
  password: string;

  @ApiPropertyOptional({ example: 'Jean', description: 'Prénom' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Dupont', description: 'Nom de famille' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'individual',
    description: 'Type de compte (slug du catalogue Role)',
    enum: ACCOUNT_TYPES,
  })
  @IsIn(ACCOUNT_TYPES)
  @IsOptional()
  accountType?: AccountType;
}
