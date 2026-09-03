# BantuExpress — Architecture Officielle

> Document d'architecture permanent. Toute décision technique future doit être conforme à ce document.
>
> **Version** : 1.0.0  
> **Statut** : Approuvé  
> **Dernière mise à jour** : 2026-07-28

---

## Table des matières
V
1. [Vision du projet](#1-vision-du-projet)
2. [Principes de développement](#2-principes-de-développement)
3. [Stack technologique officielle](#3-stack-technologique-officielle)
4. [Architecture générale](#4-architecture-générale)
5. [Structure officielle du dépôt](#5-structure-officielle-du-dépôt)
6. [Les 27 modules fonctionnels](#6-les-27-modules-fonctionnels)
7. [Architecture de la base de données](#7-architecture-de-la-base-de-données)
8. [Architecture API](#8-architecture-api)
9. [Sécurité](#9-sécurité)
10. [Offline First](#10-offline-first)
11. [Performances](#11-performances)
12. [Qualité](#12-qualité)
13. [DevOps](#13-devops)
14. [Feuille de route](#14-feuille-de-route)
15. [Règles permanentes](#15-règles-permanentes)

---

## 1. Vision du projet

### Mission

BantuExpress est une plateforme numérique d'adressage, de localisation, de livraison et de services pour la République Démocratique du Congo et l'Afrique de l'Est. Elle résout le problème fondamental de l'absence d'un système d'adressage standardisé en fournissant des repères géolocalisés, des adresses virtuelles, et des services associés.

### Objectifs

1. Créer le premier système d'adressage participatif fonctionnel pour la RDC
2. Permettre la livraison de colis sans adresse postale traditionnelle
3. Fournir un annuaire géolocalisé des personnes, entreprises et services
4. Offrir des services d'urgence géolocalisés
5. Devenir la plateforme de référence pour l'économie locale en Afrique de l'Est

### Problèmes résolus

- Absence d'adresses postales standardisées dans les zones urbaines et rurales
- Difficulté de navigation et de localisation sans repères officiels
- Impossibilité de commander des livraisons sans adresse
- Manque d'annuaire fiable des professionnels et services locaux
- Accès limité aux services d'urgence géolocalisés
- Fragmentation des identités numériques

### Public cible

- **Particuliers** : résidents urbains et ruraux en RDC et Afrique de l'Est
- **Professionnels** : commerçants, artisans, entreprises, ONG, administrations
- **Livreurs** : coursiers, transporteurs, agences de livraison
- **Services d'urgence** : police, pompiers, ambulances
- **Diaspora** : besoin de localiser et aider la famille restée au pays

### Cas d'utilisation

| Acteur | Cas d'utilisation |
|--------|-------------------|
| Particulier | Créer son profil, ajouter ses adresses avec repères, géolocaliser des lieux, partager son emplacement par QR code |
| Professionnel | Créer un profil professionnel, référencer ses services, recevoir des avis |
| Livreur | Prendre en charge des livraisons, suivre un itinéraire, mettre à jour le statut |
| Urgentiste | Recevoir des alertes géolocalisées, intervenir, mettre à jour le statut |
| Admin | Modérer le contenu, consulter les logs d'audit, gérer les utilisateurs |

### Vision à long terme

- Infrastructure nationale d'adressage numérique pour la RDC
- Plateforme ouverte avec API publique pour les intégrateurs tiers
- Support multilingue (français, lingala, swahili, tshiluba, kikongo, anglais)
- Application mobile native (React Native / Flutter)
- Intégration avec les opérateurs de téléphonie mobile (M-Pesa, Airtel Money, Orange Money)
- système de réputation et confiance pour l'économie locale

---

## 2. Principes de développement

### Offline First

L'application doit fonctionner sans connexion internet permanente. Les données sont stockées localement et synchronisées lorsque la connexion est disponible. Ce principe est fondamental pour la RDC où la couverture réseau est inégale.

**Règles** :
- Toutes les données critiques (adresses, repères, profils) doivent être disponibles hors ligne
- Les mutations hors ligne sont mises en file d'attente et synchronisées à la reconnexion
- La résolution des conflits suit la règle du « dernier écrit gagne » avec horodatage
- Les cartes doivent être mises en cache pour une consultation hors ligne

### Mobile First

L'expérience mobile est prioritaire car la majorité des utilisateurs en RDC accèdent à internet via un smartphone.

**Règles** :
- Toutes les interfaces sont conçues d'abord pour mobile (320px+)
- Les API sont optimisées pour les connexions à faible bande passante
- Les payloads JSON sont minimisés
- Le lazy loading est systématique

### API First

Toutes les fonctionnalités sont exposées via une API REST. Le frontend n'est qu'un client de l'API.

**Règles** :
- L'API est la source de vérité unique
- Toute fonctionnalité est d'abord conçue comme endpoint API
- La documentation API (OpenAPI/Swagger) est générée automatiquement
- Les versions d'API sont préfixées par `/v1`, `/v2`

### Security by Design

La sécurité est intégrée dès la conception, pas ajoutée après coup.

**Règles** :
- Validation stricte de toutes les entrées (DTOs avec class-validator)
- Authentification JWT obligatoire sur toutes les routes protégées
- Rate limiting global (100 req/min/IP) et fin par route
- Headers de sécurité (Helmet)
- CORS restreint en production
- Aucun secret dans le code source
- Validation d'environnement au boot (échec immédiat si variable manquante)
- 2FA disponible pour tous les comptes

### Scalabilité

L'architecture doit passer de 100 à 10 000 000 d'utilisateurs sans réécriture.

**Règles** :
- Backend sans état (stateless) : les sessions JWT permettent n'importe quel nombre d'instances
- Base de données : pooling de connexions unique via PrismaService @Global
- Cache Redis à intégrer pour les requêtes fréquentes
- Les tâches lourdes sont asynchrones (files d'attente Bull/BullMQ à intégrer)
- Lecture scalable : réplicas de lecture PostgreSQL

### Haute disponibilité

Le service doit être disponible 99.9% du temps.

**Règles** :
- graceful shutdown (SIGTERM/SIGINT)
- health check endpoint
- Déploiement sans temps d'arrêt (rolling update)
- Base de données avec réplication
- sauvegardes automatiques

### Modularité

Chaque fonctionnalité est un module indépendant.

**Règles** :
- Un module = un dossier dans `src/modules/`
- Un module peut être retiré sans casser les autres
- Les dépendances entre modules sont explicites (imports NestJS)
- Les modules partagés sont dans `src/common/`
- Pas de dépendances circulaires entre modules

### Clean Architecture

Séparation stricte des préoccupations en couches.

**Règles** :
- `Controller` : gestion des requêtes HTTP uniquement
- `Service` : logique métier pure, pas de connaissance HTTP
- `DTO` : validation des entrées
- `Guard` : autorisation
- `Interceptor` : cross-cutting concerns (logging, audit)
- `Filter` : gestion des erreurs
- `PrismaService` : accès base de données (seul point d'entrée DB)

### SOLID

- **S**ingle Responsibility : chaque classe a une seule raison de changer
- **O**pen/Closed : ouvert à l'extension, fermé à la modification
- **L**iskov Substitution : les sous-types doivent être substituables
- **I**nterface Segregation : des interfaces spécifiques plutôt qu'une interface générale
- **D**ependency Inversion : dépendre des abstractions, pas des concrétions

### DRY (Don't Repeat Yourself)

**Règles** :
- Les logiques répétées sont factorisées dans `src/common/`
- Les pipes de validation sont réutilisables
- Les décorateurs personnalisés évitent la duplication de code
- Les types partagés sont centralisés

### KISS (Keep It Simple, Stupid)

**Règles** :
- Privilégier la solution la plus simple qui fonctionne
- Pas de sur-architecture prématurée
- Un pattern complexe doit être justifié par un besoin réel
- Le code doit être lisible par un développeur junior

---

## 3. Stack technologique officielle

### Frontend

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **Next.js** | 16.2 | App Router, SSR/SSG, Server Components, routage fichier |
| **React** | 19.2 | UI réactive, large écosystème |
| **TypeScript** | 5 | Typage strict, fiabilité, maintenabilité |
| **Tailwind CSS** | 4 | Utilitaires CSS, rapidité de développement, cohérence |
| **Zustand** | 5 | State management léger, typé, sans boilerplate |
| **TanStack Query** | 5 | Cache, synchronisation serveur, mutations optimistes |
| **React Leaflet** | — | Cartographie interactive (Leaflet) |
| **Lucide React** | — | Icônes légères et cohérentes |
| **class-variance-authority** | — | Variantes de composants typées |
| **html5-qrcode** | — | Scan QR code dans le navigateur |

Choix justifiés :
- **Next.js** plutôt que create-react-app ou Vite : SSR pour SEO, App Router moderne, server components pour réduire le JS côté client, Image Optimization
- **Zustand** plutôt que Redux : plus simple, typé nativement, pas de boilerplate, taille réduite (1kB)
- **TanStack Query** plutôt que SWR : support plus large des mutations, cache plus sophistiqué, dédié au data fetching serveur
- **Tailwind CSS** plutôt que styled-components ou CSS Modules : rapidité de développement, bundle réduit, pas de conflits de noms, écosystème mature

### Backend

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **NestJS** | 10.4 | Framework structuré, modules, DI, guards, interceptors |
| **TypeScript** | 5.5 | Même langage qu'au frontend, partage de types possible |
| **Passport** | 0.7 | Stratégies d'authentification standardisées |
| **JWT** (jsonwebtoken + @nestjs/jwt) | — | Authentification sans état, scalable |
| **Socket.IO** | 4.8 | WebSocket temps réel pour notifications et tracking |
| **Helmet** | 7.1 | Headers de sécurité HTTP |
| **class-validator** | 0.14 | Validation déclarative des DTOs |
| **class-transformer** | 0.5 | Transformation des types |
| **@nestjs/throttler** | 6.2 | Rate limiting |
| **otplib** | 12 | 2FA (TOTP) |
| **csrf-csrf** | 4 | Protection CSRF |
| **nanoid** | 3 | Identifiants courts et uniques |

Choix justifiés :
- **NestJS** plutôt que Express seul : architecture modulaire, décorateurs, DI container, guards, interceptors, WebSocket intégré, mature
- **Passport** plutôt que next-auth ou iron-session : standard de l'industrie, multiples stratégies, bien intégré NestJS
- **Socket.IO** plutôt que WebSocket natif : fallback, rooms, namespaces, reconnection automatique
- **class-validator** plutôt que Joi ou Zod : intégration native NestJS, décorateurs, écosystème mature

### Base de données

| Technologie | Version | Justification |
|-------------|---------|---------------|
| **PostgreSQL** | 16 | Base de données relationnelle mature, fiable, riche en fonctionnalités |
| **PostGIS** | 3.4 | Extension spatiale pour requêtes géographiques |
| **Prisma** | 5.19 | ORM type-safe, migrations, studio, auto-complétion |
| **uuid-ossp** | — | Génération d'UUIDs en base |

Choix justifiés :
- **PostgreSQL** plutôt que MySQL : support natif du JSON, PostGIS, meilleure gestion des indexes, requêtes spatiales
- **PostGIS** plutôt que MongoDB GeoJSON : intégration native PostgreSQL, requêtes spatiales avancées (ST_DWithin, ST_Intersects), index GIST
- **Prisma** plutôt que TypeORM ou Drizzle : type-safety complet, migrations automatiques, Prisma Studio, excellent support PostGIS via requêtes brutes

### Cartographie

| Technologie | Justification |
|-------------|---------------|
| **Leaflet** | Client-side mapping open source, léger, bien documenté |
| **OpenStreetMap** | Données cartographiques libres et collaboratives |
| **PostGIS** | Requêtes spatiales serveur (proximité, bounding box) |

Choix justifiés :
- **Leaflet** plutôt que Mapbox GL (payant) ou Google Maps (restrictif) : open source, léger (~40kB), pas de quota, pas de clé API obligatoire, fonctionne hors ligne
- **OpenStreetMap** plutôt que Google Maps ou Here : données libres, pas de limitation d'usage, communauté active en Afrique

### Infrastructure

| Technologie | Justification |
|-------------|---------------|
| **Docker** | Conteneurisation, environnement reproductible |
| **Docker Compose** | Orchestration locale simple |
| **Netlify** (frontend) | Déploiement frontend, CDN global, fonctions serverless |
| **Serveur dédié / VPS** (backend) | Contrôle total, PostGIS, WebSocket, performances |

### CI/CD

| Technologie | Justification |
|-------------|---------------|
| **GitHub Actions** | CI/CD intégré gratuit, large écosystème |
| **ESLint** + **Prettier** | Qualité de code automatisée |
| **Jest** | Tests unitaires backend |
| **Vitest** | Tests unitaires frontend |

### Monitoring

| Technologie | Justification |
|-------------|---------------|
| **Pino / Winston** (à intégrer) | Logging structuré |
| **Sentry** (à intégrer) | Tracking d'erreurs en production |

### Authentification

| Technologie | Justification |
|-------------|---------------|
| **JWT** (access + refresh tokens) | Authentification sans état, idéal pour API REST |
| **Google OAuth** | Identité Google (ID令牌 vérifié) |
| **Apple Sign In** | Identité Apple (obligatoire pour iOS) |
| **Facebook Login** | Identité Facebook, large adoption en Afrique |
| **WhatsApp OTP** | Authentification par téléphone via code SMS/WhatsApp |
| **TOTP (otplib)** | 2FA standard |

---

## 4. Architecture générale

### Diagramme conceptuel

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Web     │  │  Mobile  │  │  Scan    │  │  API     │   │
│  │ (Next.js)│  │ (futur)  │  │ (QR)     │  │  tiers   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │        │
├───────┼──────────────┼──────────────┼──────────────┼────────┤
│       │              │              │              │        │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐  │
│  │                    API GATEWAY                        │  │
│  │              NestJS + Express + Socket.IO             │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │                    MODULES                              │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │  │
│  │  │Auth  │ │Ident.│ │Geo   │ │Deliv.│ │Notif.│  ...    │  │
│  │  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘        │  │
│  │     │         │         │         │         │          │  │
│  │  ┌──┴─────────┴─────────┴─────────┴─────────┴──┐      │  │
│  │  │           MIDDLEWARE                          │      │  │
│  │  │  Guards │ Interceptors │ Filters │ Pipes     │      │  │
│  │  └────────────────────────┬──────────────────────┘      │  │
│  └───────────────────────────┼──────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │              DATABASE LAYER                               │  │
│  │  PrismaService (Singleton @Global - un seul pool DB)     │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │          PostgreSQL + PostGIS                     │    │  │
│  │  │          (20 modèles, indexes GIST, triggers)     │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend (Next.js App Router)

#### Structure des pages

```
app/
├── page.tsx                        # Accueil (LP)
├── layout.tsx                      # Layout racine (Navbar, Footer, providers)
├── loading.tsx                     # Loading state global
├── error.tsx                       # Error boundary global
├── not-found.tsx                   # Page 404
├── globals.css                     # Styles globaux + Tailwind
├── (auth)/                         # Route group — pages publiques d'auth
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   ├── 2fa/setup/page.tsx
│   └── 2fa/verify/page.tsx
├── [u]/[userId]/page.tsx           # Profil public utilisateur (param dynamique)
├── about/page.tsx                  # À propos
├── addresses/
│   ├── page.tsx                    # Liste des adresses
│   ├── new/page.tsx                # Création d'adresse
│   └── [id]/edit/page.tsx          # Édition adresse
├── admin/
│   ├── page.tsx                    # Dashboard admin
│   ├── audit-logs/page.tsx         # Logs d'audit
│   ├── reports/
│   │   ├── page.tsx                # Liste des signalements
│   │   └── [id]/page.tsx           # Détail signalement
│   ├── users/
│   │   ├── page.tsx                # Gestion utilisateurs
│   │   └── [id]/page.tsx           # Détail utilisateur
│   ├── loading.tsx                 # Loading admin
│   └── error.tsx                   # Error boundary admin
├── business-profiles/
│   ├── page.tsx                    # Liste profils pros
│   ├── new/page.tsx                # Création profil pro
│   ├── [id]/page.tsx               # Détail profil pro
│   └── [id]/edit/page.tsx          # Édition profil pro
├── contact/page.tsx                # Contact
├── delivery/
│   ├── page.tsx                    # Liste livraisons
│   ├── loading.tsx                 # Loading livraisons
│   ├── error.tsx                   # Error boundary livraisons
│   ├── new/page.tsx                # Nouvelle livraison
│   └── [id]/page.tsx               # Suivi livraison
├── directory/page.tsx              # Annuaire
├── emergency/
│   ├── page.tsx                    # Services d'urgence
│   ├── report/page.tsx             # Nouveau signalement
│   ├── reports/
│   │   ├── page.tsx                # Liste signalements
│   │   └── [id]/page.tsx           # Suivi intervention
├── identities/
│   └── profile/page.tsx            # Identité numérique
├── landmarks/
│   ├── page.tsx                    # Points de repère
│   ├── new/page.tsx                # Ajout repère
│   └── [id]/edit/page.tsx          # Édition repère
├── map/page.tsx                    # Carte interactive
├── messages/page.tsx               # Messagerie (liste conversations)
├── notifications/page.tsx          # Notifications
├── privacy/page.tsx                # Vie privée
├── profile/page.tsx                # Mon profil
├── qr/
│   ├── page.tsx                    # Mes QR codes
│   └── scan/page.tsx               # Scanner un QR
└── search/page.tsx                 # Recherche
```

#### Providers

```
components/providers/
├── query-provider.tsx      # TanStack Query Provider (cache serveur)
├── auth-provider.tsx       # Contexte d'authentification (zustand)
```

### Backend (NestJS)

#### Communication entre les composants

```
Requête HTTP → Helmet → CORS → ThrottlerGuard → RolesGuard → Controller
  → Pipe (validation DTO) → AuditInterceptor → Service → PrismaService → PostgreSQL
  → Response ← GlobalExceptionFilter (si erreur)
```

#### Flux WebSocket

```
Socket.IO client → NotificationsGateway (namespace /notifications)
  → JWT verification → join room user:{userId}
  → NotificationsService.push() → gateway.sendToUser(userId, event, data)
```

### Flux de données

#### Inscription / Connexion

```
Client → POST /auth/register
  → AuthController.register()
    → AuthService.register()
      → Vérifie unicité email/phone
      → Hash password (scrypt salt:hash)
      → Crée User dans DB
      → Génère code vérification
      → Génère tokens JWT (access + refresh)
      → Sauvegarde refreshToken en DB
    ← { user, accessToken, refreshToken, verificationCode }
```

#### Livraison en temps réel

```
Client → POST /delivery
  → DeliveryController.create()
    → DeliveryService.create()
      → Crée Delivery (status: PENDING)
      → NotificationsGateway.sendToUser(courierId, 'new_delivery', data)
    ← Delivery

Courier → WS connecté → reçoit 'new_delivery'
Courier → PATCH /delivery/:id/assign
  → NotificationsGateway.sendToUser(clientId, 'delivery_assigned', data)
```

#### Synchronisation Offline

```
Client (offline) → mutations locales + file d'attente
Client (online) → POST /sync/push { operations: [...] }
  → SyncController.push()
    → SyncService.push()
      → Pour chaque opération : processOperation(userId, op)
        → Crée/Met à jour/Supprime l'entité
      ← { applied: N, results: [...] }

Client → GET /sync/pull?since=ISO_DATE
  → SyncController.pull()
    → SyncService.pull()
      → Récupère les entités modifiées depuis `since`
      ← { data: [...], meta: { page, limit, count } }
```

---

## 5. Structure officielle du dépôt

```
bantuexpress/
├── ARCHITECTURE.md              # Ce document — source de vérité architecture
├── AGENTS.md                    # Instructions pour l'IA de développement
├── package.json                 # Dépendances backend + scripts
├── nest-cli.json                # Configuration NestJS CLI
├── tsconfig.json                # Configuration TypeScript backend
├── tsconfig.build.json          # Configuration build TypeScript
├── .env.example                 # Template des variables d'environnement
├── .gitignore
├── docker/
│   └── docker-compose.yml       # PostgreSQL 16 + PostGIS 3.4
├── prisma/
│   ├── schema.prisma            # Schéma Prisma (20 modèles, enums, indexes)
│   ├── migrations/              # Migrations PostgreSQL
│   │   └── 003_postgis_geometry/
│   │       └── migration.sql    # Colonnes geography + triggers PostGIS
│   └── seed.ts                  # Données de test (futur)
├── src/
│   ├── main.ts                  # Point d'entrée NestJS
│   ├── app.module.ts            # Module racine (imports tous les modules)
│   ├── config/
│   │   ├── auth.config.ts       # Config JWT (namespace 'auth')
│   │   ├── database.config.ts   # Config DB (namespace 'database')
│   │   └── env.validation.ts    # Validation env au boot (class-validator)
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts    # @CurrentUser() — extrait user du request
│   │   │   └── roles.decorator.ts           # @Roles('ADMIN') — restriction par rôle
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts   # Catch tout, format uniforme
│   │   ├── guards/
│   │   │   └── roles.guard.ts               # Vérifie @Roles() sur les handlers
│   │   ├── interceptors/
│   │   │   └── audit.interceptor.ts         # Log toutes les mutations POST/PATCH/DELETE
│   │   └── pipes/
│   │       └── file-validation.pipe.ts      # Validation upload (type + taille)
│   ├── database/
│   │   ├── database.module.ts   # @Global() — singleton PrismaService
│   │   └── prisma.service.ts    # PrismaClient (connexion/déconnexion)
│   └── modules/
│       ├── addresses/           # CRUD adresses utilisateur
│       ├── admin/               # Administration (logs, modération)
│       ├── audit/               # Audit logging (global, auto-injecté)
│       ├── auth/                # Authentification (JWT, OAuth, 2FA)
│       ├── business-profiles/   # Profils professionnels
│       ├── categories/          # Catégories hiérarchiques
│       ├── delivery/            # Livraison (commandes, tracking)
│       ├── emergency/           # Services d'urgence
│       ├── events/              # Événements
│       ├── favorites/           # Favoris (polymorphiques)
│       ├── geo/                 # Géolocalisation (positions, routes, PostGIS)
│       ├── health/              # Health check (GET /health)
│       ├── identities/          # Identité numérique (profil, documents)
│       ├── landmarks/           # Points de repère (CRUD + catégories)
│       ├── messaging/           # Messagerie (conversations, messages)
│       ├── notifications/       # Notifications (CRUD + WebSocket temps réel)
│       ├── qrcodes/             # QR codes (génération, scan)
│       ├── reviews/             # Avis et évaluations
│       ├── search/              # Recherche plein texte
│       ├── sharing/             # Partage (liens, tokens)
│       └── sync/                # Synchronisation offline
├── test/
│   ├── jest-e2e.json            # Config tests e2e
│   └── app.e2e-spec.ts          # Tests e2e
├── uploads/                     # Uploads (photos, documents) — gitignored
├── dist/                        # Build backend — gitignored
├── coverage/                    # Rapports de couverture — gitignored
│
└── frontend/
    ├── package.json             # Dépendances frontend
    ├── next.config.ts           # Configuration Next.js
    ├── tsconfig.json            # Configuration TypeScript frontend
    ├── vitest.config.ts         # Configuration Vitest
    ├── vitest.setup.ts          # Setup tests frontend
    ├── postcss.config.mjs       # Configuration PostCSS (Tailwind)
    ├── eslint.config.mjs        # ESLint flat config
    ├── .env.example             # Template variables d'env frontend
    ├── public/                  # Static assets
    │   └── ...                  # Favicon, images, manifest
    └── src/
        ├── @types/
        │   └── leaflet.d.ts     # Types Leaflet manquants
        ├── app/                 # Pages Next.js App Router
        │   ├── page.tsx         # Accueil
        │   ├── layout.tsx       # Layout racine
        │   ├── loading.tsx      # Loading global
        │   ├── error.tsx        # Error boundary global
        │   ├── not-found.tsx    # 404
        │   ├── globals.css      # Styles globaux
        │   ├── (auth)/          # Routes auth (login, register, forgot-password)
        │   ├── (dashboard)/     # Routes dashboard
        │   ├── [u]/             # Profil public
        │   ├── addresses/
        │   ├── admin/
        │   ├── business-profiles/
        │   ├── delivery/
        │   ├── directory/
        │   ├── emergency/
        │   ├── identities/
        │   ├── landmarks/
        │   ├── map/
        │   ├── messages/
        │   ├── notifications/
        │   ├── profile/
        │   ├── qr/
        │   ├── search/
        │   ├── about/
        │   ├── contact/
        │   └── privacy/
        ├── components/
        │   ├── ui/              # Composants primitifs (shadcn-like)
        │   │   ├── button.tsx
        │   │   ├── card.tsx
        │   │   ├── input.tsx
        │   │   ├── avatar.tsx
        │   │   ├── dialog.tsx
        │   │   ├── label.tsx
        │   │   ├── skeleton.tsx
        │   │   ├── toast.tsx
        │   │   └── toaster.tsx
        │   ├── layout/          # Layout (navbar, footer)
        │   ├── auth/            # Composants auth (social, protected-route)
        │   ├── providers/       # Providers (query, auth)
        │   ├── map/             # Composants carte (map, location-picker, search)
        │   ├── addresses/       # Composants adresses
        │   ├── admin/           # Composants admin
        │   ├── business/        # Composants profils pro
        │   ├── emergency/       # Composants urgence
        │   ├── landmarks/       # Composants repères
        │   ├── profile/         # Composants profil
        │   ├── qr/              # Composants QR code
        │   └── search/          # Composants recherche
        ├── lib/
        │   ├── api-client.ts    # Client API générique (fetch + refresh token auto)
        │   ├── utils.ts         # Utilitaires (cn() pour Tailwind)
        │   └── api/             # API functions par module
        │       ├── addresses.ts
        │       ├── admin.ts
        │       ├── business-profiles.ts
        │       ├── delivery.ts
        │       ├── emergency.ts
        │       ├── identities.ts
        │       ├── landmarks.ts
        │       └── search.ts
        ├── hooks/
        │   ├── use-auth.ts      # Hook d'authentification
        │   └── use-toast.ts     # Hook toast
        └── stores/
            ├── auth-store.ts    # Store Zustand auth
            └── auth-store.test.ts  # Tests du store
```

### Conventions de nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Dossiers modules | kebab-case | `business-profiles/`, `qr-codes/` |
| Fichiers classe | kebab-case | `auth.service.ts`, `geo.controller.ts` |
| Classes | PascalCase | `AuthService`, `GeoController` |
| DTOs | PascalCase + suffixe Dto | `RegisterDto`, `LoginDto` |
| Interfaces | PascalCase préfixé I | `AuthenticatedUser` |
| Enums | PascalCase | `UserRole`, `DeliveryStatus` |
| Variables | camelCase | `accessToken`, `refreshToken` |
| Colonnes DB | snake_case | `email_verified_at`, `password_hash` |
| Tables DB | PascalCase | `User`, `BusinessProfile` |
| Routes API | kebab-case | `/auth/forgot-password`, `/geo/nearby` |
| Fichiers test | `.spec.ts` (backend), `.test.ts` (frontend) | `auth.service.spec.ts`, `auth-store.test.ts` |

---

## 6. Les 27 modules fonctionnels

### Module 1 — Authentification

| Aspect | Description |
|--------|-------------|
| **Objectif** | Gérer l'inscription, la connexion, la déconnexion et la sécurité des comptes |
| **Responsabilités** | Register, login, refresh token, logout, OAuth (Google/Apple/Facebook/WhatsApp), 2FA, email/phone verification, password reset |
| **Dépendances** | PrismaService, JwtService, ConfigService, `otplib`, `passport-jwt` |
| **API** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/verify-email`, `POST /auth/verify-phone`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/google`, `POST /auth/apple`, `POST /auth/facebook`, `POST /auth/whatsapp/request`, `POST /auth/whatsapp/verify`, `POST /auth/2fa/enable`, `POST /auth/2fa/verify`, `POST /auth/login/2fa` |
| **Base de données** | Table `User` (email, phone, passwordHash, OAuth IDs, 2FA secret, tokens) |
| **Écrans** | Login, Register, Forgot Password, Reset Password, Vérification email/phone, 2FA setup |
| **Règles métier** | Email ou phone unique ; hash scrypt sel:hash ; refresh token révocable ; JWT sans état ; 2FA TOTP ; OAuth validation stricte (aucun fallback decode-only) ; rate limiting 10 req/min sur login |
| **Tests** | auth-store.test.ts (13 tests frontend) ; tests contrôleur backend à compléter |
| **Risques** | Mauvaises pratiques de hash ; OAuth token mal validé ; refresh token non révoqué |
| **Évolutions** | Support SMS, WebAuthn (passkeys), session management avancé |

### Module 2 — Identité numérique

| Aspect | Description |
|--------|-------------|
| **Objectif** | Gérer le profil utilisateur et les documents d'identité |
| **Responsabilités** | CRUD profil, avatar, langues, téléphone secondaire, pièce d'identité, vérification |
| **Dépendances** | PrismaService |
| **API** | `POST /identities/profile` (créer), `GET /identities/profile` (mon profil), `PATCH /identities/profile` (modifier), `POST /identities/profile/avatar` (upload), `DELETE /identities/profile/avatar` (supprimer), `POST /identities/profile/qrcode` (générer QR), `POST /identities/profile/verify` (vérifier), `POST /identities/profile/identity-document` (upload pièce), `POST /identities/profile/signature` (upload signature), `GET /identities/:userId` (profil public) |
| **Base de données** | Table `Profile` (liée 1:1 à User) |
| **Écrans** | Mon profil, Modification profil, Vérification identité |
| **Règles métier** | Un seul profil par utilisateur ; QR code personnel unique ; document d'identité optionnel mais vérifiable |
| **Risques** | Données personnelles sensibles ; validation des documents uploadés |
| **Évolutions** | Vérification avancée (KYC), signature électronique |

### Module 3 — Adresses

| Aspect | Description |
|--------|-------------|
| **Objectif** | CRUD des adresses utilisateur avec géolocalisation |
| **Responsabilités** | Créer, lire, mettre à jour, supprimer (soft) des adresses ; marquer comme principale ; adresse publique/privée |
| **Dépendances** | PrismaService, GeoModule (optionnel) |
| **API** | `GET/POST /addresses`, `GET/PUT/DELETE /addresses/:id` |
| **Base de données** | Table `Address` (latitude, longitude, type, label, ville, province, pays) ; geo col `location` (PostGIS) |
| **Écrans** | Liste adresses, Création adresse, Détail/édition adresse |
| **Règles métier** | Soft delete ; une seule adresse principale par utilisateur ; adresse publique visible sur profil ; partage par token |
| **Risques** | Données de localisation imprécises |
| **Évolutions** | Adresses validées par la communauté, import groupé |

### Module 4 — Points de repère

| Aspect | Description |
|--------|-------------|
| **Objectif** | Base de données collaborative de points de repère (routes, quartiers, bâtiments) |
| **Responsabilités** | CRUD repères, catégorisation, modération, vérification |
| **Dépendances** | PrismaService |
| **API** | `GET/POST /landmarks`, `GET/PUT/DELETE /landmarks/:id` |
| **Base de données** | Table `Landmark` (nom, catégorie, description, coordonnées) ; geo col `location` (PostGIS) |
| **Écrans** | Liste repères, Carte, Création repère, Détail repère |
| **Règles métier** | Soft delete ; repère public/privé ; vérification par admin possible ; catégorie obligatoire |
| **Risques** | Doublons, repères incorrects, spam |
| **Évolutions** | Vérification communautaire, validation par les pairs, suggestion automatique |

### Module 5 — Géolocalisation & Carte

| Aspect | Description |
|--------|-------------|
| **Objectif** | Services de géolocalisation temps réel et historiques |
| **Responsabilités** | Mise à jour position, historique, recherche à proximité, calcul d'itinéraire, bornes de carte, routes sauvegardées |
| **Dépendances** | PrismaService, PostGIS |
| **API** | `POST /geo/position`, `GET /geo/position`, `GET /geo/position/history`, `GET /geo/nearby`, `GET /geo/markers`, `POST /geo/route`, `POST /geo/routes`, `GET /geo/routes`, `GET /geo/routes/:id` |
| **Base de données** | Tables `UserPosition`, `Route` ; indexes GIST sur `location` ; triggers PostGIS |
| **Écrans** | Carte interactive, Recherche proximité, Calcul itinéraire |
| **Règles métier** | Position mise à jour en différé (éviter batterie) ; historique limité ; fallback Haversine si PostGIS indisponible |
| **Risques** | Vie privée des positions ; batterie mobile ; précision GPS |
| **Évolutions** | Tracking temps réel (livreurs), géofencing, clustering de marqueurs |

### Module 6 — Recherche & Annuaire

| Aspect | Description |
|--------|-------------|
| **Objectif** | Recherche plein texte dans les personnes, entreprises, repères |
| **Responsabilités** | Recherche globale, filtres, pagination, suggestions |
| **Dépendances** | PrismaService |
| **API** | `GET /search?q=&type=&city=&province=&category=&latitude=&longitude=&radius=&page=&limit=` |
| **Base de données** | Tables User, Profile, BusinessProfile, Landmark |
| **Écrans** | Page de recherche, Résultats filtrables |
| **Règles métier** | Limité aux entités publiques ; pagination obligatoire ; recherche insensible à la casse |
| **Risques** | Performances requêtes LIKE ; indexation plein texte |
| **Évolutions** | Elasticsearch/MeiliSearch, recherche phonétique, suggestions IA |

### Module 7 — QR Codes

| Aspect | Description |
|--------|-------------|
| **Objectif** | Génération et gestion de QR codes pour adresses, profils, événements |
| **Responsabilités** | Création, scan, compteur de scans, lien vers entité |
| **Dépendances** | PrismaService |
| **API** | `POST /qrcodes` (créer), `GET /qrcodes/mine` (mes QR), `GET /qrcodes/:code` (résoudre), `GET /qrcodes/:code/stats` (statistiques), `PATCH /qrcodes/:code/scan` (enregistrer scan) |
| **Base de données** | Table `QrCode` (code unique, entityType, entityId, scans) |
| **Écrans** | Mes QR codes, Scanner, QR dédié (profil, adresse, entreprise) |
| **Règles métier** | Un code unique par entité ; compteur de scans ; lien permanent |
| **Risques** | QR codes frauduleux |
| **Évolutions** | QR dynamiques (redirection), QR avec logo, design personnalisé |

### Module 8 — Profils professionnels

| Aspect | Description |
|--------|-------------|
| **Objectif** | Profils pour entreprises, ONG, administrations |
| **Responsabilités** | CRUD profil pro, gestion des membres, horaires d'ouverture, produits |
| **Dépendances** | PrismaService |
| **API** | `POST /business-profiles` (créer), `GET /business-profiles` (lister), `GET /business-profiles/mine` (mes profils), `GET /business-profiles/:id` (détail), `PATCH /business-profiles/:id` (modifier), `DELETE /business-profiles/:id` (supprimer), `PATCH /business-profiles/:id/verify` (vérifier), `POST /business-profiles/:id/members` (ajouter membre), `GET /business-profiles/:id/members` (lister membres), `DELETE /business-profiles/:id/members/:userId` (retirer membre), `POST /business-profiles/:id/products` (créer produit), `GET /business-profiles/:id/products` (lister produits), `PATCH /business-profiles/products/:productId` (modifier produit), `DELETE /business-profiles/products/:productId` (supprimer produit), `PUT /business-profiles/:id/opening-hours` (définir horaires), `GET /business-profiles/:id/opening-hours` (obtenir horaires) |
| **Base de données** | Tables `BusinessProfile`, `BusinessMember`, `OpeningHour`, `Product` |
| **Écrans** | Profil pro, Création, Détail, Gestion membres, Produits |
| **Règles métier** | Un utilisateur peut avoir plusieurs profils pros ; vérification possible ; soft delete |
| **Risques** | Fausses entreprises, spam |
| **Évolutions** | Abonnements, publicité, catalogue avancé |

### Module 9 — Livraison

| Aspect | Description |
|--------|-------------|
| **Objectif** | Plateforme de livraison de colis entre particuliers et professionnels |
| **Responsabilités** | Création commande, assignation livreur, suivi temps réel, preuve de livraison |
| **Dépendances** | PrismaService, NotificationsModule, GeoModule |
| **API** | `POST /delivery/orders` (créer), `GET /delivery/orders` (mes commandes), `GET /delivery/orders/available` (disponibles), `GET /delivery/orders/:id` (détail), `PATCH /delivery/orders/:id/cancel` (annuler), `PATCH /delivery/orders/:id/accept` (accepter), `PATCH /delivery/orders/:id/pickup` (retirer), `PATCH /delivery/orders/:id/deliver` (livrer), `POST /delivery/orders/:id/tracking` (ajouter point), `GET /delivery/orders/:id/tracking` (historique tracking) |
| **Base de données** | Tables `Delivery`, `DeliveryTracking` |
| **Écrans** | Liste livraisons, Création livraison, Suivi livraison (timeline + carte) |
| **Règles métier** | Statuts : PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED ; annulation possible avant PICKED_UP ; photo de preuve optionnelle |
| **Risques** | Livreur non fiable, colis perdu, conflit client-livreur |
| **Évolutions** | Paiement intégré (M-Pesa), notation des livreurs, livraison groupée, optimisation de tournées |

### Module 10 — Services d'urgence

| Aspect | Description |
|--------|-------------|
| **Objectif** | Signalement et suivi des situations d'urgence |
| **Responsabilités** | Signalement, assignation intervenant, suivi, résolution |
| **Dépendances** | PrismaService, NotificationsModule, GeoModule |
| **API** | `POST /emergency/reports` (créer), `GET /emergency/reports` (mes signalements), `GET /emergency/reports/active` (actifs — rôle EMERGENCY), `GET /emergency/reports/:id` (détail), `PATCH /emergency/reports/:id/assign` (assigner intervenant), `PATCH /emergency/reports/:id/start` (démarrer intervention), `PATCH /emergency/reports/:id/resolve` (résoudre), `PATCH /emergency/reports/:id/cancel` (annuler) |
| **Base de données** | Tables `Emergency` (type, sévérité, statut, coordonnées) |
| **Écrans** | Signalement urgence, Suivi intervention, Dashboard urgence |
| **Règles métier** | Types : POLICE, FIRE, MEDICAL, ACCIDENT, NATURAL_DISASTER ; sévérité : LOW à CRITICAL ; notification automatique des intervenants à proximité |
| **Risques** | Fausses alertes, vie privée, latence critique |
| **Évolutions** | Géolocalisation automatique, appel d'urgence, intégration avec les centres de secours officiels |

### Module 11 — Administration

| Aspect | Description |
|--------|-------------|
| **Objectif** | Outils d'administration et de modération |
| **Responsabilités** | Logs d'audit, gestion des signalements, statistiques |
| **Dépendances** | PrismaService, AuditModule |
| **API** | `GET /admin/users` (lister), `GET /admin/users/:id` (détail), `PATCH /admin/users/:id/role` (changer rôle), `PATCH /admin/users/:id/status` (activer/désactiver), `POST /admin/reports` (créer signalement), `GET /admin/reports` (lister), `GET /admin/reports/:id` (détail), `PATCH /admin/reports/:id/review` (traiter), `GET /admin/stats` (statistiques), `GET /admin/audit-logs` (logs), `GET /admin/audit-logs/:id` (détail log) |
| **Base de données** | Tables `AdminAuditLog`, `ContentReport` |
| **Écrans** | Dashboard admin, Audit logs, Signalements, Statistiques |
| **Règles métier** | Accès réservé au rôle ADMIN ; toutes les actions admin sont journalisées |
| **Risques** | Abus de pouvoir, accès non autorisé |
| **Évolutions** | Permissions fines, équipe de modération, dashboard analytics |

### Module 12 — Notifications

| Aspect | Description |
|--------|-------------|
| **Objectif** | Notifications temps réel et historisées |
| **Responsabilités** | CRUD notifications, émission WebSocket, push vers les appareils |
| **Dépendances** | PrismaService, ConfigService, Socket.IO |
| **API** | `GET /notifications` (lister), `POST /notifications/:id/read` (marquer lue), `POST /notifications/read-all` (tout marquer lu), `DELETE /notifications/:id` (supprimer une), `DELETE /notifications` (tout effacer), `GET /notifications/count` (non lues) |
| **Base de données** | Table `Notification` (type, titre, body, data JSON, readAt) |
| **Écrans** | Liste notifications |
| **Règles métier** | Notification lue = `readAt` défini ; tri chronologique inverse ; WebSocket namespace `/notifications` avec JWT |
| **Risques** | Volume de notifications, spam |
| **Évolutions** | Push mobile (FCM/APNs), grouping, préférences notification |

### Module 13 — Favoris

| Aspect | Description |
|--------|-------------|
| **Objectif** | Gestion des favoris polymorphiques (adresses, repères, profils pros) |
| **Responsabilités** | Ajout/suppression favoris, liste favoris |
| **Dépendances** | PrismaService |
| **API** | `POST /favorites` (ajouter), `GET /favorites` (lister avec filtre entityType), `DELETE /favorites/:id` (supprimer par ID), `DELETE /favorites/entity/:entityType/:entityId` (supprimer par entité), `GET /favorites/count/:entityType/:entityId` (compter) |
| **Base de données** | Table `Favorite` (userId, entityType, entityId) — contrainte d'unicité |
| **Écrans** | Liste favoris |
| **Règles métier** | Unicité (userId + entityType + entityId) ; polymorphique |
| **Risques** | Aucun majeur |
| **Évolutions** | Collections, favoris partagés |

### Module 14 — Avis & Évaluations

| Aspect | Description |
|--------|-------------|
| **Objectif** | Système d'avis et notes sur les entités |
| **Responsabilités** | CRUD avis, calcul moyenne, modération |
| **Dépendances** | PrismaService |
| **API** | `POST /reviews` (créer), `GET /reviews` (lister), `PATCH /reviews/:id` (modifier), `DELETE /reviews/:id` (supprimer), `GET /reviews/stats/:entityType/:entityId` (statistiques) |
| **Base de données** | Table `Review` (userId, entityType, entityId, rating 1-5, comment) |
| **Écrans** | Avis sur profil pro, sur repère |
| **Règles métier** | Un avis par utilisateur par entité ; note de 1 à 5 |
| **Risques** | Faux avis, abus de notation |
| **Évolutions** | Vérification des avis, réponse aux avis, photos |

### Module 15 — Événements

| Aspect | Description |
|--------|-------------|
| **Objectif** | Création et gestion d'événements |
| **Responsabilités** | CRUD événements, QR code événement |
| **Dépendances** | PrismaService |
| **API** | `POST /events` (créer), `GET /events` (lister), `GET /events/mine` (mes événements), `GET /events/:id` (détail), `PATCH /events/:id` (modifier), `DELETE /events/:id` (supprimer) |
| **Base de données** | Table `Event` (nom, description, adresse, coordonnées, dates, QR) |
| **Écrans** | Liste événements, Création, Détail |
| **Règles métier** | Organisé par un utilisateur ; date de début obligatoire |
| **Risques** | Événements frauduleux |
| **Évolutions** | Participants, RSVP, calendrier, rappels |

### Module 16 — Catégories

| Aspect | Description |
|--------|-------------|
| **Objectif** | Catégories hiérarchiques pour classer les entités |
| **Responsabilités** | CRUD catégories, arborescence parent-enfant, slug |
| **Dépendances** | PrismaService |
| **API** | `POST /categories` (créer — ADMIN), `GET /categories` (lister toutes), `GET /categories/roots` (racines), `GET /categories/:id` (détail), `GET /categories/slug/:slug` (par slug), `PATCH /categories/:id` (modifier — ADMIN), `DELETE /categories/:id` (supprimer — ADMIN, bloque si enfant) |
| **Base de données** | Table `Category` (nom, slug unique, parentId) |
| **Écrans** | (Back-office principalement) |
| **Règles métier** | Slug unique ; arborescence récursive parent-enfant |
| **Risques** | Hiérarchie trop profonde |
| **Évolutions** | Catégories pré-définies pour les profils pros et repères |

### Module 17 — Messagerie

| Aspect | Description |
|--------|-------------|
| **Objectif** | Messagerie interne entre utilisateurs |
| **Responsabilités** | Conversations, messages, pièces jointes |
| **Dépendances** | PrismaService |
| **API** | `POST /messaging/conversations` (créer), `GET /messaging/conversations` (lister avec lastMessage), `GET /messaging/conversations/unread` (non lues), `GET /messaging/conversations/:id` (détail), `POST /messaging/conversations/:id/messages` (envoyer message), `GET /messaging/conversations/:id/messages` (messages paginés) |
| **Base de données** | Tables `Conversation`, `ConversationParticipant`, `Message` |
| **Écrans** | Liste conversations, Conversation (chat temps réel) |
| **Règles métier** | Conversation entre 2+ participants ; types supportés : `TEXT`, `IMAGE`, `LOCATION` ; pagination obligatoire sur les messages |
| **Risques** | Spam, contenu inapproprié |
| **Évolutions** | WebSocket temps réel, fichiers attachés, messages vocaux, chats de groupe |

### Module 18 — QR Codes (scan)

Cf. Module 7 — mêmes responsabilités

### Module 19 — Partage

| Aspect | Description |
|--------|-------------|
| **Objectif** | Partage d'entités (adresse, profil, repère) par lien temporaire |
| **Responsabilités** | Création lien partage, accès via token, expiration |
| **Dépendances** | PrismaService |
| **API** | `POST /sharing` (créer lien), `GET /sharing/mine` (mes liens), `GET /sharing/resolve/:token` (résoudre), `DELETE /sharing/:id` (supprimer) |
| **Base de données** | Table `ShareLink` (token, entityType, entityId, expiresAt) |
| **Écrans** | Page de partage (vue publique de l'entité partagée) |
| **Règles métier** | Token unique ; expiration optionnelle ; lié à un utilisateur |
| **Risques** | Lien partagé accessible sans auth |
| **Évolutions** | Protection par mot de passe, statistiques de vues |

### Module 20 — Synchronisation Offline

| Aspect | Description |
|--------|-------------|
| **Objectif** | Synchronisation des données entre le client et le serveur |
| **Responsabilités** | Push (envoi mutations) / Pull (récupération delta), résolution de conflits |
| **Dépendances** | PrismaService |
| **API** | `POST /sync/push` (envoyer mutations, max 100 opérations), `GET /sync/pull?since=&entityType=&page=&limit=` (récupérer delta) |
| **Base de données** | Tables Address, Landmark, BusinessProfile |
| **Règles métier** | Max 100 opérations par push ; résolution « dernier écrit gagne » ; soft delete pour suppression |
| **Risques** | Conflits de synchronisation ; données volumineuses |
| **Évolutions** | CRDT, vector clocks, sync en continu (WebSocket) |

### Module 21 — Audit

| Aspect | Description |
|--------|-------------|
| **Objectif** | Journalisation des actions administratives et des mutations |
| **Responsabilités** | Persistance des logs, consultation, filtre par action |
| **Dépendances** | PrismaService (via AuditInterceptor injecté globalement) |
| **API** | `GET /admin/audit-logs` (via AdminModule) |
| **Base de données** | Table `AdminAuditLog` (adminId, action, targetType, targetId, metadata JSON) |
| **Règles métier** | Log toutes les mutations POST/PATCH/DELETE pour les utilisateurs authentifiés ; échec d'écriture non bloquant |
| **Risques** | Volume de logs |
| **Évolutions** | Rétention configurable, rotation, export |

### Module 22 — Sécurité & Rate Limiting

| Aspect | Description |
|--------|-------------|
| **Objectif** | Protection contre les abus et les attaques |
| **Responsabilités** | Rate limiting global (100 req/min/IP) et par route, CORS, Helmet, validation |
| **Dépendances** | @nestjs/throttler, helmet, csrf-csrf |
| **Règles métier** | Rate limiting global + fin sur login (10/min) et forgot-password (3/min) |
| **Risques** | Faux positifs (blocage utilisateur légitime) |
| **Évolutions** | Rate limiting par utilisateur, WAF, DDoS protection |

### Module 23 — Health Check

| Aspect | Description |
|--------|-------------|
| **Objectif** | Vérification que l'API est opérationnelle |
| **Responsabilités** | Health endpoint, vérification DB |
| **Dépendances** | PrismaService |
| **API** | `GET /health` |
| **Règles métier** | Pas d'authentification requise |
| **Évolutions** | Vérification des dépendances (Redis, S3, etc.) |

### Module 24 — Signalements

| Aspect | Description |
|--------|-------------|
| **Objectif** | Signalement de contenu inapproprié |
| **Responsabilités** | Création signalement, modération, statut |
| **Dépendances** | PrismaService (via AdminModule) |
| **API** | `POST /admin/reports` (créer — par tout utilisateur), `GET /admin/reports` (lister — ADMIN), `GET /admin/reports/:id` (détail — ADMIN), `PATCH /admin/reports/:id/review` (traiter — ADMIN) |
| **Base de données** | Table `ContentReport` (reporterId, entityType, entityId, reason, status) |
| **Règles métier** | Raisons : SPAM, INAPPROPRIATE, FAKE, DUPLICATE ; statut : PENDING, REVIEWED, DISMISSED |
| **Risques** | Abus de signalement |
| **Évolutions** | Auto-modération, timeout |

### Module 25 — Profils publics (`[u]`)

| Aspect | Description |
|--------|-------------|
| **Objectif** | Page publique d'un utilisateur |
| **Responsabilités** | Affichage profil public, adresses publiques, repères publics |
| **Dépendances** | PrismaService, IdentitiesModule, AddressesModule, LandmarksModule |
| **Écrans** | Page `/[u]/` publique |
| **Règles métier** | Seules les entités marquées `isPublic` sont visibles |

### Module 26 — Upload & Fichiers

| Aspect | Description |
|--------|-------------|
| **Objectif** | Gestion des uploads (avatars, photos de livraison, documents) |
| **Responsabilités** | Upload, validation type/taille, stockage sur disque |
| **Dépendances** | `file-validation.pipe.ts` |
| **Règles métier** | Types autorisés : images (jpeg, png, webp, gif), PDF ; taille max : 5 Mo avatar, 10 Mo document, 2 Mo signature ; stockage local dans `./uploads/` servi statiquement |
| **Risques** | Malware, saturation disque |
| **Évolutions** | Stockage S3 (AWS/Cloudflare R2), images optimisées (sharp), CDN |

### Module 27 — Géolocalisation avancée

Regroupe les fonctionnalités PostGIS du Module 5. Mêmes specs, documenté séparément pour la planification.

---

## 7. Architecture de la base de données

### Modèle relationnel

```
User (1) ──── (1) Profile
  │
  ├── (N) Address
  ├── (N) Landmark
  ├── (N) UserPosition
  ├── (N) Route
  ├── (N) QrCode
  ├── (N) BusinessProfile ──── (N) BusinessMember
  │                             ├── (N) OpeningHour
  │                             └── (N) Product
  ├── (N) Delivery (client)
  ├── (N) Delivery (courier)
  │       └── (N) DeliveryTracking
  ├── (N) Emergency (reporter)
  ├── (N) Emergency (responder)
  ├── (N) ContentReport (reporter)
  ├── (N) ContentReport (reviewer)
  ├── (N) AdminAuditLog
  ├── (N) Event
  ├── (N) Favorite
  ├── (N) Review
  ├── (N) Notification
  ├── (N) ConversationParticipant ──── (1) Conversation
  │                                     └── (N) Message
  └── (N) ShareLink

Category (1) ──── (N) Category (self, parentId)
```

### Tables (20 modèles)

| Table | Type | Description |
|-------|------|-------------|
| `User` | Principale | Comptes utilisateurs |
| `Profile` | 1:1 | Profil détaillé |
| `Address` | Principale | Adresses utilisateur |
| `Landmark` | Principale | Points de repère |
| `UserPosition` | Temporelle | Positions GPS historiques |
| `Route` | Temporelle | Itinéraires calculés |
| `QrCode` | Principale | QR codes |
| `BusinessProfile` | Principale | Profils professionnels |
| `BusinessMember` | Jonction | Membres d'une entreprise |
| `OpeningHour` | Dépendante | Horaires d'ouverture |
| `Product` | Dépendante | Produits/Services |
| `Delivery` | Principale | Commandes de livraison |
| `DeliveryTracking` | Temporelle | Tracking livraison |
| `Emergency` | Principale | Signalements d'urgence |
| `ContentReport` | Principale | Signalements de contenu |
| `AdminAuditLog` | Journal | Logs d'audit admin |
| `Favorite` | Jonction | Favoris polymorphiques |
| `Review` | Principale | Avis/Évaluations |
| `Event` | Principale | Événements |
| `Conversation` | Principale | Conversations |
| `ConversationParticipant` | Jonction | Participants conversation |
| `Message` | Temporelle | Messages |
| `Notification` | Temporelle | Notifications |
| `ShareLink` | Temporelle | Liens de partage |
| `Category` | Principale | Catégories hiérarchiques |

### Contraintes d'intégrité

- **Unicité** : `User.email`, `User.phone`, `User.googleId`, `User.appleId`, `User.facebookId`, `User.whatsappId`, `Profile.userId`, `Profile.personalQrCode`, `QrCode.code`, `ShareLink.token`, `Category.slug`
- **Unicité composite** : `QrCode[entityType, entityId]`, `BusinessMember[businessId, userId]`, `OpeningHour[businessProfileId, dayOfWeek]`, `Favorite[userId, entityType, entityId]`, `ConversationParticipant[conversationId, userId]`
- **Soft delete** : `Address.deletedAt`, `Landmark.deletedAt`, `BusinessProfile.deletedAt`

### Indexes

- **Indexes simples** : `UserPosition[userId, recordedAt]`, `Notification[userId, readAt]`, `Delivery[status]`, `Landmark[category]`, `Address[city, province]`
- **Indexes GIST (PostGIS)** : `UserPosition.location`, `Landmark.location`, `Address.location`
- **Indexes temporels** : `UserPosition[recordedAt]`, `Notification[createdAt]`, `AdminAuditLog[createdAt]`

### PostGIS

Trois colonnes `geography(Point, 4326)` ajoutées via migration `003_postgis_geometry` :

- `UserPosition.location` — tracking temps réel
- `Landmark.location` — recherche à proximité des repères
- `Address.location` — recherche à proximité des adresses

Chaque colonne est maintenue par un trigger `BEFORE INSERT OR UPDATE OF latitude, longitude` qui synchronise automatiquement la colonne `geography` à partir des colonnes `latitude`/`longitude` existantes.

Les fonctions PostGIS utilisées :
- `ST_DWithin` — recherche dans un rayon (avec index GIST)
- `ST_Intersects` — recherche dans une bounding box
- `ST_MakeEnvelope` — bounding box pour `getMarkersInBounds`
- `ST_Distance` — calcul de distance précise (géodésique)

Fallback Haversine côté serveur si PostGIS est indisponible.

### Audit

La table `AdminAuditLog` enregistre toutes les mutations non-GET des utilisateurs authentifiés. Le champ `metadata` est un `JsonB` qui stocke le code HTTP et pourra stocker les changements de données (dif).

### Migrations

- Prisma Migrate gère les migrations (`prisma migrate dev` pour le développement, `prisma migrate deploy` pour la production)
- Les migrations PostGIS (`003_postgis_geometry`) utilisent `$queryRawUnsafe` car Prisma ne supporte pas nativement les types PostGIS
- Les nouvelles migrations doivent être testées avec `prisma migrate dev` puis appliquées en production avec `prisma migrate deploy`

---

## 8. Architecture API

### REST

L'API est exclusivement RESTful. Toutes les réponses sont en JSON. Les ressources sont identifiées par des URLs, les opérations par les verbes HTTP.

### Convention des routes

```
Méthode  | Route                            | Action
---------|----------------------------------|----------------
GET      | /resources                       | Lister
POST     | /resources                       | Créer
GET      | /resources/:id                   | Lire
PATCH    | /resources/:id                   | Modifier partiellement
DELETE   | /resources/:id                   | Supprimer
```

Actuellement l'API est en version implicite (pas de préfixe `/v1/`). Aucun préfixe de version n'est utilisé. La version explicite sera ajoutée lors de la première breaking change.

**Conventions** :
- Noms de ressources en kebab-case pluriel : `/addresses`, `/business-profiles`, `/qr-codes`
- Sous-ressources : `/delivery/:id/tracking`
- Actions non-CRUD : verbes POST sur des ressources nommées : `/auth/login`, `/sync/push`
- Query parameters pour filtres, pagination, tri

### GraphQL

Non utilisé actuellement. Pourrait être ajouté pour des besoins de requêtes complexes (dashboard admin, analytics) si le REST devient limitant.

### Versionnement

- Aucun préfixe de version pour l'instant (routes nues : `/auth/login`, `/delivery/orders`)
- À l'avenir : préfixe `/v1/`, `/v2/` dans l'URL
- Les breaking changes nécessitent une nouvelle version majeure
- L'ancienne version est supportée pendant 6 mois minimum

### Authentification

- **JWT Bearer Token** : `Authorization: Bearer <accessToken>`
- **Access Token** : courte durée (configurable, défaut 3600s)
- **Refresh Token** : longue durée (7 jours), stocké en DB, révocable
- **2FA** : token temporaire à 2ème étape, vérifié avant délivrance des tokens
- **WebSocket** : token passé dans `auth.token` ou `query.token` à la connexion

### Documentation

- Swagger/OpenAPI via `@nestjs/swagger` (déjà dans les dépendances)
- Génération automatique des DTOs et réponses
- Exposition sur `/api/docs` en développement

### Gestion des erreurs

Format uniforme (via `GlobalExceptionFilter`) :

```json
{
  "statusCode": 404,
  "path": "/addresses/123",
  "timestamp": "2026-07-28T10:30:00.000Z",
  "message": "Address not found"
}
```

- Codes HTTP standards (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500)
- Pas de stack trace en production
- Logs structurés (erreur 500 : `logger.error` avec stack ; 400-499 : `logger.warn`)

### Pagination

Format uniforme pour toutes les listes :

```json
{
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

- `page` : 1-indexed (défaut 1)
- `limit` : max 100 (défaut 20)
- Présent sur toutes les routes GET qui retournent des listes

### Recherche

- `GET /search?q=<term>&type=<entityType>&city=<city>&page=<n>&limit=<n>`
- Recherche insensible à la casse
- Types supportés : `users`, `businesses`, `landmarks`, `all`
- Pagination standard

### Filtres

- Par statut : `?status=active`
- Par type : `?type=professional`
- Par catégorie : `?category=restaurant`
- Par ville/province : `?city=kinshasa&province=kinshasa`
- Intervalle de dates : `?since=2026-01-01&until=2026-12-31`
- Coordonnées : `?latitude=-4.3&longitude=15.3&radius=5000`

---

## 9. Sécurité

### JWT

- **Access token** : signé avec `JWT_SECRET`, contient `sub` (userId) et `role`
- **Refresh token** : signé avec `JWT_SECRET + '_refresh'`, stocké en base, comparé strictement
- **2FA temporary token** : signé avec `JWT_SECRET + '_2fa'`, durée 5 minutes, contient `step: '2fa'`
- Les tokens sont validés à chaque requête via Passport JWT strategy
- Désactivation immédiate : le refresh token en DB est supprimé au logout

### OAuth

- **Google** : validation via clés publiques Google (`https://www.googleapis.com/oauth2/v3/certs`), vérification `email_verified`
- **Apple** : validation via clés publiques Apple (`https://appleid.apple.com/auth/keys`), vérification du `issuer`
- **Facebook** : validation via Graph API (`https://graph.facebook.com/me`)
- **WhatsApp** : OTP par code à 6 chiffres
- Aucun fallback « decode-only » — validation cryptographique stricte obligatoire

### RBAC (Role-Based Access Control)

Rôles définis dans `UserRole` :
| Rôle | Description |
|------|-------------|
| `INDIVIDUAL` | Utilisateur standard |
| `PROFESSIONAL` | Professionnel / entreprise |
| `ADMIN` | Administrateur |
| `EMERGENCY` | Intervenant d'urgence |
| `COURIER` | Livreur |
| `TRANSPORTER` | Transporteur |
| `DELIVERY_AGENCY` | Agence de livraison |

- `RolesGuard` global vérifie `@Roles(...)` sur les contrôleurs
- `JwtAuthGuard` protège les routes authentifiées
- `OptionalAuthGuard` permet l'accès public avec utilisateur optionnel

### Permissions

Actuellement gérées par rôle uniquement. Les permissions fines (par ressource, par action) seront implémentées ultérieurement.

### Validation

- **Toutes les entrées** sont validées par des DTOs avec `class-validator`
- Pipes globaux : `whitelist` (supprime les props inconnues), `forbidNonWhitelisted` (rejette si props inconnues), `transform` (convertit les types)
- Validation spécifique appliquée :
  - `@IsEmail()` sur les emails
  - `@Matches(/^\+?[1-9]\d{6,14}$/)` sur les téléphones
  - `@Matches(/^[A-Z]{2}$/)` sur les codes pays
  - `@Length(6,6)` sur les codes 2FA/WhatsApp
  - `@Min(0)`, `@MaxLength()` sur les autres champs
- Upload : `FileTypeValidator` (types MIME) + `MaxFileSizeValidator` (taille max)

### Chiffrement

- **Mots de passe** : hashés avec `scrypt` (sel 16 bytes + hash 64 bytes, format `sel:hash`)
- **TOTP** : secret généré via `otplib`, stocké en clair (nécessaire pour vérification)
- **Tokens** : JWT signés (HMAC-SHA256)
- **Rafraîchissement** : token de reset hashé (SHA256) avant stockage
- **Transport** : HTTPS obligatoire en production

### Secrets

- Tous les secrets dans les variables d'environnement (`.env`)
- `.env` jamais commité
- `.env.example` contient des valeurs factices
- Validation au boot : si `JWT_SECRET` ou `DATABASE_URL` est manquant, l'application refuse de démarrer

### Protection contre les attaques courantes

| Attaque | Protection |
|---------|------------|
| XSS | Helmet (X-XSS-Protection), React échappe le JSX |
| CSRF | CSRF tokens (csrf-csrf) |
| SQL Injection | Prisma ORM (requêtes paramétrées) |
| Brute force | ThrottlerGuard (100 req/min/IP global, 10/min login, 3/min forgot-password) |
| Nosqli | Pas de MongoDB |
| Mass Assignment | Whitelist + forbidNonWhitelisted sur DTOs |
| Path Traversal | Helmet, pas de résolution de chemin utilisateur |
| Clickjacking | Helmet (X-Frame-Options) |
| MIME sniffing | Helmet (X-Content-Type-Options) |
| Open Redirect | Validation des URLs de redirection |
| Information Disclosure | GlobalExceptionFilter (pas de stack trace en prod) |

---

## 10. Offline First

### Synchronisation

Le module `SyncModule` gère la synchronisation bidirectionnelle entre le client et le serveur.

**Push** (client → serveur) :
- Le client envoie un lot d'opérations (create/update/delete)
- Le serveur applique chaque opération séquentiellement
- Les opérations en conflit sont retournées avec statut `conflict`
- Maximum 100 opérations par lot

**Pull** (serveur → client) :
- Le client demande les entités modifiées depuis une date
- Filtre par type d'entité (addresses, landmarks, business-profiles)
- Pagination standard

### Résolution des conflits

- Stratégie : **Last Write Wins (LWW)** basé sur l'horodatage `updatedAt`
- En cas de conflit : l'opération reçoit un statut `conflict`, le client décide de la résolution
- Pas de version vectorielle pour l'instant (sera ajoutée si les conflits deviennent fréquents)

### Cache

- TanStack Query gère le cache côté frontend
- Stratégie `stale-while-revalidate` par défaut
- Cache local (localStorage/IndexedDB) à implémenter pour les données critiques
- Les requêtes fréquentes (positions, notifications) ont un staleTime court
- Les données de référence (catégories, profils publics) ont un staleTime long

### GPS hors ligne

- Les positions GPS sont enregistrées localement en continu
- Synchronisées vers le serveur lors de la reconnexion
- Les données de localisation (dernière position, historique récent) disponibles hors ligne

### Cartes hors ligne

- Leaflet supporte le tile caching
- Les tuiles OpenStreetMap peuvent être mises en cache via `localStorage` ou un service worker
- Les markers et repères sont synchronisés via SyncModule

### Files d'attente

- Les mutations hors ligne sont mises en file d'attente (IndexedDB)
- À la reconnexion, la file est envoyée via `POST /sync/push`
- Ordre FIFO garanti
- Échec d'une opération → passage à la suivante (pas de blocage)

### Synchronisation différée

- Les notifications push WebSocket sont reçues uniquement en ligne
- Les notifications manquées sont récupérées via `GET /notifications` au prochain démarrage
- Le statut de synchronisation est affiché à l'utilisateur (connecté/synchronisation/ hors ligne)

---

## 11. Performances

### Cache

- **Serveur** : Redis à intégrer pour les sessions, le cache de requêtes, et la file d'attente
- **Client** : TanStack Query avec stratégies de staleTime personnalisées
- **Images** : CDN + optimisation automatique (Next.js Image component)
- **API** : ETag et Cache-Control headers sur les ressources peu changeantes

### Optimisation

- **Lazy loading** : composants React chargés à la demande (`next/dynamic`)
- **Code splitting** : automatique avec Next.js App Router
- **Bundle** : minimisé par Next.js, tree-shaking automatique
- **Images** : WebP/AVIF, lazy loading natif, dimensions explicites
- **Polices** : `next/font` (Geist), auto-hébergées, pas de requête externe

### Pagination

- Obligatoire sur toutes les listes
- Limitée à 100 éléments max par page
- Curseur-based pagination à considérer pour les très grandes listes

### Lazy Loading

- Composants lourds (carte Leaflet, scanneur QR) chargés dynamiquement
- Images au-dessus-de-la-ligne (above the fold) chargées immédiatement
- Images en-dessous chargées avec `loading="lazy"`

### Compression

- Compression gzip activée sur le reverse proxy (Nginx/Netlify)
- Réponses JSON compressées automatiquement
- Images optimisées à l'upload (sharp/futur)

### Requêtes SQL

- Toutes les requêtes passent par Prisma (ORM type-safe)
- Requêtes complexes (spatiales) via `$queryRawUnsafe` avec paramètres typés
- Limitation du nombre de requêtes par page (N+1 évité par Prisma `include` et `select`)

### Index

- Index sur toutes les colonnes de jointure (`userId`, `entityId`, etc.)
- Index sur les colonnes de filtre (`status`, `category`, `city`)
- Index GIST sur les colonnes geographiques
- Index composites pour les requêtes fréquentes
- Index couvrant pour les tris chronologiques

---

## 12. Qualité

### Convention de code

- **ESLint** avec config TypeScript + Prettier
- **Prettier** pour le formatage automatique
- Pre-commit hooks (husky/lint-staged) à configurer

### Lint

- Backend : `npm run lint` (eslint)
- Frontend : `npm run lint` (eslint)
- Règles : `@typescript-eslint`, `prettier`, pas de `console.log` (sauf Logger)
- CI : lint vérifié avant chaque merge

### Formatage

- **Prettier** avec configuration par défaut
- Formatage automatique au save dans l'IDE
- CI : vérification du formatage

### Tests

| Type | Technologie | Commande | Cible |
|------|------------|----------|-------|
| Unitaires backend | Jest | `npm test` | Services, contrôleurs |
| E2E backend | Jest + supertest | `npm run test:e2e` | API complète |
| Unitaires frontend | Vitest + RTL | `npm test` (frontend) | Stores, composants |
| Coverage threshold | 80% | `npm run test:cov` | Tous les fichiers |

- Tests dans `*.spec.ts` (backend) et `*.test.ts` (frontend)
- Tests proches du code testé (dans le dossier `tests/` du module ou à côté du fichier)
- Mocking des dépendances externes (Prisma, ConfigService)

### Documentation

- **Ce document** : architecture générale
- **README.md** : démarrage rapide
- **JSDoc** : commentaires sur les classes et méthodes publiques (uniquement quand nécessaire)
- **Swagger** : documentation auto de l'API (à activer)
- **ADRs** : Architecture Decision Records pour les décisions importantes

### Revue de code

- Pull requests obligatoires
- Au moins un reviewer avant merge
- Vérifications CI passées (lint, test, build)
- Conformité avec ce document d'architecture

---

## 13. DevOps

### Docker

```yaml
# docker/docker-compose.yml
services:
  postgis:
    image: postgis/postgis:16-3.4
    ports: ["5432:5432"]
    volumes: [postgis_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bantuexpress -d bantuexpress_dev"]
```

- **Développement** : docker-compose pour PostgreSQL + PostGIS uniquement
- **Production** : PostgreSQL managé (ou auto-hébergé avec réplication)

### Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NODE_ENV` | Oui | `development`, `test`, `production` |
| `PORT` | Oui | Port du serveur (1-65535) |
| `DATABASE_URL` | Oui | URL de connexion PostgreSQL |
| `JWT_SECRET` | Oui | Clé secrète JWT |
| `JWT_EXPIRATION` | Oui | Durée de validité du token |
| `CORS_ORIGIN` | Non | Origine CORS autorisée (vide = toutes) |

### Déploiement

**Frontend (Next.js)** → Netlify
- `npm run build` génère les fichiers statiques
- Déploiement automatique via Git (branch `main`)
- Variables d'env configurées dans Netlify dashboard
- Fonctions serverless Netlify si nécessaire (API proxy)

**Backend (NestJS)** → Serveur dédié / VPS
- `npm run build` compile le TypeScript
- Démarrage avec `node dist/main` ou via PM2/Nodemon
- Reverse proxy Nginx (HTTPS, compression, static files)
- Base de données PostgreSQL managée (ou auto-hébergée)

### Sauvegardes

- Base de données : `pg_dump` quotidien
- Uploads : backup du dossier `uploads/`
- Rotation : 7 jours de backup local, 30 jours de backup distant (S3)

### Monitoring

- **Health check** : `GET /health` (à enrichir avec vérification DB, Redis, etc.)
- **Logs** : Winston/Pino (à intégrer) avec rotation
- **Erreurs** : Sentry (à intégrer)
- **Métriques** : Prometheus à considérer

### CI/CD

Pipeline GitHub Actions à configurer :

```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [checkout, npm ci, npm run lint]
  test:
    runs-on: ubuntu-latest
    steps: [checkout, npm ci, npm test]
  build:
    runs-on: ubuntu-latest
    steps: [checkout, npm ci, npm run build]
```

Environnements : `development` (branche develop), `staging` (branche staging), `production` (branche main)

---

## 14. Feuille de route

### Phase 0 — Fondations (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Structure NestJS + Prisma + PostgreSQL + PostGIS | AppModule, DatabaseModule, Config, Common | ✅ |
| Validation, sécurité, monitoring | Env validation, GlobalExceptionFilter, Helmet, Throttler | ✅ |
| Modules vides (scaffold 21 modules) | Tous les modules | ✅ |

### Phase 1 — Authentification (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Inscription, connexion, JWT, refresh token | Auth | ✅ |
| Email/phone verification, forgot/reset password | Auth | ✅ |
| Google OAuth | Auth | ✅ |
| Apple OAuth, Facebook OAuth, WhatsApp OTP | Auth | ✅ |
| 2FA TOTP | Auth | ✅ |

### Phase 2 — Identité numérique (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Profil utilisateur | Identities | ✅ |
| Avatar, pièce d'identité | Identities | ✅ |

### Phase 3 — Adresses (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| CRUD adresses, types, géolocalisation | Addresses | ✅ |
| Adresse principale, publique/privée, partage | Addresses | ✅ |

### Phase 4 — Points de repère (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| CRUD repères, catégories | Landmarks | ✅ |

### Phase 5 — Géolocalisation & Carte (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Position utilisateur, historique | Geo | ✅ |
| PostGIS (ST_DWithin, ST_Intersects, indexes GIST) | Geo | ✅ |
| Recherche à proximité, itinéraire, bornes carte | Geo | ✅ |

### Phase 6 — Recherche & Annuaire (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Recherche plein texte | Search | ✅ |

### Phase 7 — QR Codes (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| CRUD QR codes, scan, compteur | QrCodes | ✅ |

### Phase 8 — Profils professionnels (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| CRUD profils pro, membres, horaires, produits | BusinessProfiles | ✅ |

### Phase 9 — Livraison (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| CRUD livraisons, statuts, tracking | Delivery | ✅ |
| Notifications temps réel sur tracking | Delivery + Notifications | ✅ |

### Phase 10 — Services d'urgence (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Signalement urgence, assignation, suivi | Emergency | ✅ |

### Phase 11 — Administration (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Audit logs, signalements, statistiques | Admin | ✅ |

### Phase 12 — Modules complémentaires (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Favoris, Reviews, Events, Categories | Favorites, Reviews, Events, Categories | ✅ |
| Messaging, Sharing, Notifications | Messaging, Sharing, Notifications | ✅ |
| Audit, Sync | Audit, Sync | ✅ |
| Social buttons (OAuth réel) | Auth (frontend) | ✅ |
| Pages manquantes (about, contact, privacy) | Pages frontend | ✅ |

### Phase 13 — Qualité & CI (Terminée)

| Objectif | Modules | Statut |
|----------|---------|--------|
| Tests auth-store (13 tests) | Frontend tests | ✅ |
| Coverage threshold 80% | Jest config | ✅ |
| Validation DTOs renforcée | Tous les DTOs | ✅ |
| PostGIS triggers + indexes | Migration SQL | ✅ |

### Phase 14 — Cycle 3 : Consolidation (À faire)

| Objectif | Tâches | Effort estimé |
|----------|--------|---------------|
| **Tests contrôleurs backend** | Tests d'intégration pour les 19 modules | 1.5j |
| **Swagger/OpenAPI** | Activer `@nestjs/swagger`, documenter tous les endpoints | 1j |
| **CI/CD** | GitHub Actions (lint → test → build) | 0.5j |
| **Monitoring** | Winston/Pino logger structuré | 1j |
| **Docker healthcheck** | Fix compose, scripts de démarrage | 0.5j |
| **Redis cache** | Mise en cache des requêtes fréquentes | 1j |
| **Sentry** | Error tracking production | 0.5j |

### Phase 15 — Mobile & Hors ligne (À faire)

| Objectif | Tâches | Effort estimé |
|----------|--------|---------------|
| **PWA** | Service worker, offline page, app manifest, IndexedDB pour sync | 2j |
| **Mobile API** | Optimisation des payloads, endpoints spécifiques mobiles | 1j |
| **Cache cartographique** | Tile caching Leaflet pour zones fréquentes | 1j |
| **Sync améliorée** | WebSocket sync en continu, CRDT si nécessaire | 2j |

### Phase 16 — Paiement & Monétisation (À faire)

| Objectif | Tâches | Effort estimé |
|----------|--------|---------------|
| **Paiement livraison** | Intégration M-Pesa, Airtel Money, Orange Money | 3j |
| **Premium** | Abonnements professionnels, fonctionnalités payantes | 2j |
| **Publicité** | Annonces locales sponsorisées | 2j |

### Risques globaux

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Couverture réseau insuffisante | Critique | Offline First, sync différée |
| Adresses inexactes | Élevé | Validation communautaire, modération |
| Fausses urgences | Critique | Vérification, blocage après abus |
| Sécurité des données personnelles | Critique | Encryption, RBAC, audits réguliers |
| Scalabilité | Moyen | Architecture stateless, cache Redis, réplicas DB |
| Dépendance OAuth (Google, Apple, Facebook) | Moyen | Fallback email/phone toujours disponible |

---

## 15. Règles permanentes

### Règle 1 — Conformité impérative

Aucune fonctionnalité ne pourra être développée sans respecter ce document. Toute modification devra être cohérente avec cette architecture.

### Règle 2 — Documentation préalable

Toute nouvelle fonctionnalité devra être documentée (ADR) avant son implémentation. L'ADR doit décrire :
- Le problème
- Les solutions envisagées
- La solution retenue et sa justification
- L'impact sur l'architecture existante

### Règle 3 — Signalement des écarts

Si le projet actuel contient des incohérences avec cette architecture, elles devront être signalées avant toute modification.

### Règle 4 — Principe de moindre surprise

Le code doit être prévisible. Suivre les patterns établis. Ne pas introduire de nouveaux frameworks sans justification écrite.

### Règle 5 — TypeScript strict

Le mode strict de TypeScript est obligatoire. Pas de `any`, pas de `@ts-ignore` (sauf exception documentée).

### Règle 6 — Single source of truth

- La base de données est la source de vérité unique
- Le cache est toujours invalidable
- Pas de duplication des données critiques

### Règle 7 — Sécurité d'abord

- Validation de toutes les entrées
- Authentification sur toutes les routes sauf publiques
- Rate limiting systématique
- Pas de logs de données sensibles

### Règle 8 — Tests avant merge

- Aucun code non testé ne peut être mergé dans `main`
- Coverage minimum : 80%
- Les tests doivent passer avant le merge

### Règle 9 — Revue de code

- Toute PR nécessite au moins un reviewer
- Le reviewer vérifie la conformité avec ce document
- Les décisions architecturales doivent être approuvées par le lead

### Règle 10 — Évolutivité

- Les migrations DB doivent être descendantes (rollbackable)
- Les API doivent être versionnées avant breaking change
- Les modules doivent être indépendants (pas de couplage fort)

---

## Annexes

### A. Écarts constatés avec le code existant

| # | Écart | Fichier concerné | Priorité | Statut |
|---|-------|------------------|----------|--------|
| 1 | ~~Pas de préfixe `/api/v1/` dans les routes API~~ | `main.ts` + frontend `api-client.ts` | ~~Faible~~ | ✅ CORRIGÉ (Lot 4) |
| 2 | ~~Pas de Swagger/OpenAPI activé~~ | `main.ts` / AppModule | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 2) |
| 3 | ~~Logger non structuré (console.log dans bootstrap)~~ | `main.ts` | ~~Basse~~ | ✅ CORRIGÉ (Lot 4) |
| 4 | ~~Cache en mémoire (Redis optionnel)~~ | `AppModule` | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 3) |
| 5 | ~~Pas de CI/CD GitHub Actions~~ | `.github/` | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 2) |
| 6 | ~~Pas de tests d'intégration pour les contrôleurs~~ | 4 contrôleurs couverts | ~~Haute~~ | ✅ CORRIGÉ (Lot 2) |
| 7 | ~~Pas de service worker / PWA~~ | Frontend | ~~Haute~~ | ✅ CORRIGÉ (Lot 3) |
| 8 | ~~Pas de Sentry / error tracking~~ | Absent | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 3) |
| 9 | ~~Pas de désactivation 2FA~~ | `AuthService` | ~~Basse~~ | ✅ CORRIGÉ (Lot 2) |
| 10 | ~~Pas de pagination sur delivery/notifications~~ | Contrôleurs | ~~Moyenne~~ | ✅ DÉJÀ CORRIGÉ |
| 11 | ~~`jsonwebtoken` en import dynamique~~ | `auth.service.ts` | ~~Basse~~ | ✅ CORRIGÉ (Lot 2) |
| 12 | ~~Rate limiting OAuth manquant~~ | AuthController | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 1) |
| 13 | ~~`prisma/seed.ts` non implémenté~~ | `prisma/seed.ts` | ~~Basse~~ | ✅ CORRIGÉ (Lot 3) |
| 14 | ~~Token reset exposé en production~~ | `AuthService` | ~~Haute~~ | ✅ CORRIGÉ (Lot 1) |
| 16 | ~~CSRF non configuré~~ | `main.ts` | ~~Moyenne~~ | ✅ CORRIGÉ (Lot 2) |

### B. Commandes de référence

```bash
# Développement
npm run start:dev              # Backend en mode watch
npm run prisma:studio          # Prisma Studio
npx prisma generate            # Générer client Prisma
npx prisma migrate dev         # Créer une migration
npx prisma migrate deploy      # Appliquer migrations en production

# Tests
npm test                       # Tests unitaires backend
npm run test:cov               # Tests avec couverture
npm run test:e2e               # Tests e2e
cd frontend && npm test        # Tests frontend

# Lint & Format
npm run lint                   # ESLint backend
npm run format                 # Prettier backend
cd frontend && npm run lint    # ESLint frontend

# Build
npm run build                  # Build backend
cd frontend && npm run build   # Build frontend

# Base de données
docker compose -f docker/docker-compose.yml up -d   # Démarrer PostgreSQL
npm run prisma:reset                                 # Reset DB + re-migrate
npm run prisma:seed                                  # Seed
```

### C. Glossaire

| Terme | Définition |
|-------|------------|
| **ADR** | Architecture Decision Record — document court décrivant une décision architecturale |
| **GIST** | Generalized Search Tree — index PostgreSQL pour données géospatiales |
| **PostGIS** | Extension spatiale pour PostgreSQL |
| **SRID 4326** | Système de coordonnées WGS 84 (latitude/longitude standard GPS) |
| **TOTP** | Time-based One-Time Password — norme pour 2FA (RFC 6238) |
| **RBAC** | Role-Based Access Control |
| **PWA** | Progressive Web Application |
| **CRDT** | Conflict-free Replicated Data Type — structure de données pour synchronisation sans conflit |
| **KYC** | Know Your Customer — vérification d'identité |
| **FIFO** | First In, First Out — ordre de traitement des files d'attente |

---

> **Document approuvé le 2026-07-28.**  
> Toute modification de ce document doit être approuvée par le Chief Software Architect et versionnée.
