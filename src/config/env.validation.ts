import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

/**
 * Schema des variables d'environnement requises. L'application refuse
 * de demarrer si une variable obligatoire est absente ou mal typee -
 * mieux vaut echouer immediatement au boot qu'en pleine nuit sur une
 * requete de production a cause d'un DATABASE_URL manquant.
 */
class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRATION: string;

  @IsString()
  @IsOptional()
  CSRF_SECRET?: string;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // Resend (email provider)
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_EMAIL?: string;

  // Africa's Talking (SMS provider)
  @IsString()
  @IsOptional()
  AT_API_KEY?: string;

  @IsString()
  @IsOptional()
  AT_USERNAME?: string;

  @IsString()
  @IsOptional()
  AT_SENDER_ID?: string;

  // Limite globale du ThrottlerGuard (par défaut 100 req/min/IP)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT?: number;

  // OAuth - binding d'applications (aud/azp). Optionnels en local,
  // requis côté serveur pour activer le login social.
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  APPLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_APP_ID?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_APP_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join(' | ');
    throw new Error(`Configuration d'environnement invalide : ${details}`);
  }

  return validatedConfig;
}
