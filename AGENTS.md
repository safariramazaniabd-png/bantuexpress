# BantuExpress — NestJS API

## Project state

Phase 0 (Fondations) terminée. Projet NestJS 10 avec Prisma 5, PostgreSQL + PostGIS.

## Structure

```
src/
├── main.ts
├── app.module.ts                # imports tous les modules + providers globaux
├── config/
│   ├── auth.config.ts           # namespace auth (jwtSecret, jwtExpiration)
│   ├── database.config.ts       # namespace database (url)
│   └── env.validation.ts        # class-validator, rejette au boot si vars manquantes
├── common/
│   ├── decorators/current-user.decorator.ts
│   ├── filters/global-exception.filter.ts     # @Catch(), réponse JSON uniforme
│   └── interceptors/audit.interceptor.ts
├── database/
│   ├── database.module.ts       # @Global(), singleton PrismaService
│   └── prisma.service.ts
└── modules/
    ├── auth/                    # strategie JWT (Passport)
    ├── audit/                   # @Global() (vide, squelettique)
    ├── health/                  # GET /health
    ├── identities/
    ├── geo/
    ├── landmarks/
    ├── sync/
    ├── delivery/
    └── notifications/
          └── (modules vides — à implémenter dans les phases suivantes)
```

## Commandes

```bash
npm run start:dev          # dev avec watch
npm run build              # build production
npm test                   # tests unitaires
npm run test:e2e           # tests e2e
npx prisma generate        # générer le client Prisma
npx prisma migrate dev     # créer une migration
npm run prisma:studio      # Prisma Studio
```

## Dépendances du bootstrap

1. `docker compose -f docker/docker-compose.yml up -d` (PostgreSQL 16 + PostGIS 3.4)
2. `cp .env.example .env` (ou utiliser le `.env` existant)
3. `npm install`
4. `npx prisma generate`
5. `npm run start:dev`

## Key facts

- **DB**: PostgreSQL + PostGIS via Prisma ORM. `database.module.ts` est `@Global()` — un seul PrismaService (un seul pool de connexions).
- **Auth**: JWT via `@nestjs/passport` + `passport-jwt`. Token validé sur chaque requête (désactivation immédiate, pas seulement à l'émission).
- **BigInt serialization**: `main.ts:15` patche `BigInt.prototype.toJSON` — ne jamais convertir les BigInt manuellement dans les services.
- **Validation**: `ValidationPipe` global avec `whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion: true`.
- **Sécurité**: `helmet()` + CORS (`CORS_ORIGIN`, toutes origines en dev) + `ThrottlerGuard` (100 req/min/IP) + `enableShutdownHooks()` (K8s).
- **Error handling**: `GlobalExceptionFilter` catch tout, format JSON uniforme, pas de détails internes sauf en dev.
- **Env validation**: schéma `class-validator` dans `env.validation.ts` — l'app refuse de booter si une variable obligatoire manque.

## Phases planifiées (ordre)

1. Authentification (inscription, connexion, email/phone/Google, sessions, mot de passe oublié)
2. Identité numérique (profil, photo, langues, pièce d'identité, QR personnel)
3. Adresses (CRUD, multiple par user, publique/privée)
4. Points de repère (route, quartier, bâtiments, GPS)
5. Géolocalisation & carte (position, marqueurs, itinéraire)
6. Recherche & annuaire (personnes, entreprises, services)
7. QR Codes (adresse, entreprise, scan, partage)
8. Profils professionnels (entreprises, ONG, administrations)
9. Livraison (client, livreur, commande, suivi)
10. Services d'urgence (police, pompiers, ambulance)
11. Administration (utilisateurs, signalements, statistiques, permissions)
