import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { doubleCsrf } from 'csrf-csrf';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';

/**
 * JSON.stringify ne sait pas serialiser un BigInt nativement (utilise
 * par plusieurs colonnes `sync_version` en base). Plutot que de
 * convertir manuellement chaque valeur au cas par cas dans chaque
 * service (source d'oubli garantie a mesure que l'equipe grandit), on
 * fixe le comportement une bonne fois pour toutes ici. Voir le
 * commentaire laisse dans GeoService pour le contexte de ce choix.
 */
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    });
    logger.log('Sentry initialise');
  } else {
    logger.warn('SENTRY_DSN non defini — Sentry desactive');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Recommande en production : desactive les logs verbeux par defaut
    // de Nest au profit du logger applicatif structure (a brancher plus
    // tard, ex. Pino/Winston, en Module DevOps).
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BantuExpress API')
    .setDescription('Plateforme numérique d\'adressage et de localisation pour la RDC et l\'Afrique de l\'Est')
    .setVersion('1.0')
    .setContact('BantuExpress Team', 'https://bantu-express.com', 'contact@bantu-express.com')
    .setLicense('UNLICENSED', 'https://github.com/anomalyco/bantuexpress/blob/main/LICENSE')
    .addServer('http://localhost:3000', 'Development')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'csrf-token',
      'api/docs',
      { path: '', method: RequestMethod.GET },
    ],
  });

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') ?? true,
    credentials: true,
  });

  // Validation globale de tous les DTOs entrants :
  // - whitelist : supprime silencieusement les proprietes non declarees dans le DTO
  // - forbidNonWhitelisted : rejette la requete si des proprietes inconnues sont presentes
  // - transform : necessaire pour que @Type(() => Number) fonctionne sur les query params
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Arret propre (ferme les connexions Prisma, termine les jobs en cours)
  // sur SIGTERM/SIGINT - indispensable en environnement Kubernetes/K3s
  // ou les pods recoivent regulierement des signaux d'arret.
  // En production, un CSRF_SECRET fort est obligatoire : on refuse de démarrer
  // avec la valeur de secours (réservée au développement local). En dev/test,
  // on garde une valeur par défaut non-mystérieuse pour faciliter la mise en route.
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const csrfSecret = configService.get<string>('CSRF_SECRET');
  if (isProduction && !csrfSecret) {
    throw new Error('CSRF_SECRET est obligatoire en production');
  }
  const resolveSecret = csrfSecret ?? 'csrf-secret-dev-only';

  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => resolveSecret,
    getSessionIdentifier: (req) => req.ip ?? 'unknown',
    cookieName: 'csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: configService.get<string>('NODE_ENV') === 'production',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  // Requis par csrf-csrf (v3) : il lit les tokens dans `req.cookies`, qui n'est
  // peuplé que par ce middleware. Sans lui, GET /csrf-token et toutes les
  // requêtes POST retournent 500.
  app.use(cookieParser());

  app.use(doubleCsrfProtection);

  app.use('/csrf-token', (req: express.Request, res: express.Response) => {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') ?? 3000;
  // Écoute sur toutes les interfaces : indispensable pour être accessible dans
  // un conteneur (Docker / Cloud Run). Cloud Run injecte sa propre variable PORT.
  const host = '0.0.0.0';
  await app.listen(port, host);

  logger.log(`BantuExpress API demarree sur le port ${port} (env: ${configService.get<string>('NODE_ENV')})`);
}

bootstrap().catch((error) => {
  const exitLogger = new Logger('Bootstrap');
  exitLogger.error('Echec du demarrage de l\'application :', (error as Error).stack);
  process.exit(1);
});
