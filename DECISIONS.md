# BantuExpress — Décisions d'Architecture (ADRs)

> **Dernière mise à jour** : 2026-07-29

---

## ADR-001 : Utilisation de Prisma plutôt que TypeORM

**Contexte** : Choix de l'ORM pour PostgreSQL + PostGIS.

**Décision** : Prisma 5.

**Raison** : Génération de types TypeScript automatique, schéma déclaratif, migrations fiables, support PostGIS natif via extensions.

**Conséquence** : Un seul PrismaService global, pas de requêtes SQL brutes sauf pour les cas PostGIS avancés.

---

## ADR-002 : JWT avec rotation de refresh tokens

**Contexte** : Stratégie d'authentification pour l'API REST.

**Décision** : Access token JWT courte durée + refresh token avec rotation et détection de reuse.

**Raison** : La rotation permet de détecter le vol de refresh tokens. Si un token est réutilisé après rotation, toutes les sessions sont révoquées.

**Conséquence** : Table `RefreshTokenSession` pour tracker les sessions actives. Chaque refresh porte un JTI unique.

---

## ADR-003 : Sous-services plutôt qu'un monolithe auth

**Contexte** : `AuthService` atteignait 637 lignes avec 15+ responsabilités.

**Décision** : Refactorisation en 7 sous-services spécialisés.

**Raison** : Testabilité, maintenabilité, séparation des concerns.

**Conséquence** : Chaque sous-service a ses propres tests unitaires. Le `AuthService` devient un orchestrateur qui délègue.

---

## ADR-004 : Scrypt pour le hash des mots de passe

**Contexte** : Algorithme de hash des mots de passe.

**Décision** : `crypto.scryptSync` avec salt aléatoire de 16 bytes et clé de 64 bytes.

**Raison** : Scrypt est résistant au matériel ASIC, disponible nativement dans Node.js (pas de dépendance externe), paramétrable.

**Stockage** : Format `salt:hash` (hex), 144 caractères au total.

---

## ADR-005 : Anti brute-force au niveau applicatif

**Contexte** : Protection contre les attaques par force brute sur login.

**Décision** : Compteur de tentatives échouées dans la table `User`, lock à 5 échecs pendant 15 minutes.

**Raison** : Évite la dépendance à un service externe (Redis) pour le MVP. Journalisation dans `LoginAttempt` pour audit.

**Conséquence** : Nécessite une requête DB supplémentaire à chaque login. Acceptable pour le volume attendu.

---

## ADR-006 : CSRF double-submit cookie pattern

**Contexte** : Protection CSRF pour l'API.

**Décision** : Cookie httpOnly `csrf-token` + header `x-csrf-token` en double submit.

**Raison** : Simple à implémenter, pas de stockage serveur, fonctionne avec le frontend Next.js.

**Conséquence** : Les mutations (POST/PUT/PATCH/DELETE) doivent envoyer le header `x-csrf-token`. Le frontend récupère le token via `GET /csrf-token`.

---

## ADR-007 : BigInt serialisation globale

**Contexte** : Plusieurs colonnes `sync_version` utilisent BigInt en base, non serialisable par `JSON.stringify`.

**Décision** : Patch global de `BigInt.prototype.toJSON` dans `main.ts`.

**Raison** : Évite les oublis dans chaque service. Solution unique et centralisée.

**Conséquence** : Le patch est appliqué au démarrage de l'application.

---

## ADR-008 : Zustand plutôt que Redux

**Contexte** : Gestion d'état frontend.

**Décision** : Zustand 5.

**Raison** : API minimaliste, pas de boilerplate, support TypeScript natif, taille réduite.

**Conséquence** : Un store par domaine (auth-store, etc.), pas de providers globaux lourds.
