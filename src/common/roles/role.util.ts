import { UserRole } from '@prisma/client';
import { ACCOUNT_TYPES, AccountType } from '../../modules/auth/dto/register.dto';

/**
 * Correspondance entre les slugs des types de compte (catalogue Role) et
 * les valeurs de l'enum UserRole (rôle primaire porté par User.role et le JWT).
 * Maintient la compatibilité avec RolesGuard (@Roles(UserRole.X)).
 */
export const ACCOUNT_TYPE_TO_ROLE: Record<AccountType, UserRole> = {
  individual: UserRole.INDIVIDUAL,
  entreprise: UserRole.PROFESSIONAL,
  administration: UserRole.ADMIN,
  ong: UserRole.NGO,
  livreur: UserRole.COURIER,
  transporteur: UserRole.TRANSPORTER,
  'agence-livraison': UserRole.DELIVERY_AGENCY,
  urgence: UserRole.EMERGENCY,
  police: UserRole.POLICE,
  pompiers: UserRole.FIREFIGHTER,
  ambulance: UserRole.AMBULANCE,
};

export const ROLE_TO_ACCOUNT_TYPE: Record<UserRole, AccountType> = {
  [UserRole.INDIVIDUAL]: 'individual',
  [UserRole.PROFESSIONAL]: 'entreprise',
  [UserRole.ADMIN]: 'administration',
  [UserRole.NGO]: 'ong',
  [UserRole.COURIER]: 'livreur',
  [UserRole.TRANSPORTER]: 'transporteur',
  [UserRole.DELIVERY_AGENCY]: 'agence-livraison',
  [UserRole.EMERGENCY]: 'urgence',
  [UserRole.POLICE]: 'police',
  [UserRole.FIREFIGHTER]: 'pompiers',
  [UserRole.AMBULANCE]: 'ambulance',
};

export function isAccountTypeSlug(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}
