# BantuExpress — Guide de Développement

> **Version** : 1.0.0  
> **Dernière mise à jour** : 2026-07-29

---

## 1. Prérequis

| Outil | Version | Commande de vérification |
|-------|---------|--------------------------|
| Node.js | >= 20 | `node --version` |
| npm | >= 10 | `npm --version` |
| Docker | >= 24 | `docker --version` |
| Docker Compose | >= 2 | `docker compose version` |

## 2. Setup

```bash
# 1. Démarrer PostgreSQL + PostGIS
docker compose -f docker/docker-compose.yml up -d

# 2. Variables d'environnement
cp .env.example .env

# 3. Installer les dépendances
npm install

# 4. Générer le client Prisma
npx prisma generate

# 5. Créer la base de données
npx prisma migrate dev

# 6. Démarrer le serveur de développement
npm run start:dev
```

Le frontend nécessite une seconde terminal :

```bash
cd frontend
npm install
npm run dev
```

## 3. Structure du projet

```
bantuexpress/
├── docker/                    # Configuration Docker
├── prisma/                    # Schema + migrations
│   └── schema.prisma
├── src/
│   ├── main.ts                # Point d'entrée
│   ├── app.module.ts          # Module racine
│   ├── config/                # Configuration (env)
│   ├── common/                # Décorateurs, filtres, intercepteurs
│   ├── database/              # PrismaService (singleton)
│   └── modules/               # Modules fonctionnels
│       └── auth/              # Exemple : authentification
│           ├── auth.controller.ts
│           ├── auth.service.ts
│           ├── auth.module.ts
│           ├── dto/            # Data Transfer Objects
│           ├── guards/         # Guards NestJS
│           ├── strategies/     # Stratégies Passport
│           ├── services/       # Sous-services métier
│           └── tests/          # Tests unitaires
├── test/                      # Tests e2e
├── frontend/                  # Application Next.js
└── docs/                      # Documentation (si ajouté)
```

## 4. Conventions de code

### Backend (NestJS)
- **Modules** : chaque module contient son contrôleur, service, DTOs, guards, tests
- **DTOs** : classes avec décorateurs `class-validator` et `@ApiProperty()` pour Swagger
- **Services** : un service par responsabilité, max ~150 lignes
- **Tests** : un fichier `.spec.ts` par service ET par contrôleur
- **Exports** : utiliser `@nestjs/swagger` pour documenter les endpoints

### Frontend (Next.js)
- **Pages** : dans `app/(auth)/` pour les pages d'authentification
- **Store** : Zustand pour l'état global
- **Composants** : UI primitives dans `components/ui/`
- **Validation** : fonctions partagées dans `lib/validation.ts`

### Git
- Commits en français, descriptifs
- Branche `main` protégée
- Les PRs doivent passer lint + tests

## 5. Commandes essentielles

```bash
# Backend
npm run start:dev          # Dev avec watch
npm run build              # Build production
npm test                   # Tests unitaires
npm run test:e2e           # Tests e2e
npm run test:cov           # Couverture
npm run prisma:studio      # Prisma Studio
npm run lint               # ESLint

# Frontend
cd frontend
npm run dev                # Dev server (port 3001)
npm run build              # Build production
npm run test               # Vitest
```

## 6. Workflow type

1. Démarrer la base de données : `docker compose -f docker/docker-compose.yml up -d`
2. Démarrer le backend : `npm run start:dev`
3. Démarrer le frontend : `cd frontend && npm run dev`
4. Accéder à l'API : `http://localhost:3000/api/v1`
5. Accéder à Swagger : `http://localhost:3000/api/docs`
6. Accéder au frontend : `http://localhost:3001`

## 7. Tests

- Les tests unitaires utilisent Jest (backend) et Vitest (frontend)
- Les services sont testés avec des mocks de PrismaService
- Les contrôleurs sont testés avec `supertest` + mocks des services
- Les sous-services (dans `services/`) ont leurs propres tests unitaires
- Les tests e2e nécessitent une base de données en fonctionnement
