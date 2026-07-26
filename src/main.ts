import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
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

  const app = await NestFactory.create(AppModule, {
    // Recommande en production : desactive les logs verbeux par defaut
    // de Nest au profit du logger applicatif structure (a brancher plus
    // tard, ex. Pino/Winston, en Module DevOps).
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.use(helmet());

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
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  logger.log(`BantuExpress API demarree sur le port ${port} (env: ${configService.get<string>('NODE_ENV')})`);
}

bootstrap().catch((error) => {
  // Un echec au demarrage doit arreter le processus immediatement et
  // bruyamment - jamais de demarrage "a moitie" qui repondrait 500 sur
  // toutes les routes sans que personne ne le remarque.
  // eslint-disable-next-line no-console
  console.error('Echec du demarrage de l\'application :', error);
  process.exit(1);
});
