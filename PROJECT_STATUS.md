# BantuExpress — État du Projet

> **Dernière mise à jour** : 2026-09-03 (M2 — identité numérique)

---

## Phase 0 — Fondations ✅ Terminée

- Projet NestJS 10 avec Prisma 5, PostgreSQL + PostGIS
- Structure modulaire avec 27 modules planifiés
- Configuration : auth, database, env validation
- Common : CurrentUser decorator, GlobalExceptionFilter, AuditInterceptor
- PrismaService global singleton

---

## Module 1 — Création de compte & Authentification (Phase M1)

### ✅ Terminé
- **20+ endpoints backend** (register, login, refresh, logout, me, verify-email/phone, resend-code, forgot/reset/change-password, OAuth Google/Apple/Facebook, WhatsApp/SMS-OTP, 2FA, **sessions**)
- **11 sous-services** (JwtToken, Registration, Login, TwoFactor, PasswordReset, Verification, OAuth, **Otp**, **Session**, **Security**, Password util)
- **Sécurité** :
  - Codes OTP stockés **hachés** (SHA-256) dans la table `OtpCode` (canal email/SMS, finalité, tentatives max, one-shot) — plus de `verificationCode` en clair
  - OAuth : validation du **binding d'applications** (`aud` Google/Apple, `app_id` Facebook) + erreur 503 propre si fournisseur non configuré
  - Création systématique du profil (firstName/lastName) à l'inscription (email + social)
  - `PasswordHistory` (anti-réutilisation des 5 derniers mots de passe, la constante existait)
  - Répartition scrypt **centralisée** dans `common/crypto/password.util`
- **Rôles** : catalogue `Role` seedé avec les **11 types de compte** + table `UserRoleAssignment` (multi-rôles) ; `User.role` conservé comme rôle primaire (compatibilité totale avec `RolesGuard`/JWT) ; enum `UserRole` étendu (NGO, POLICE, FIREFIGHTER, AMBULANCE)
- **Sessions** : `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` (révocation ciblée)
- **Correctifs fonctionnels** : `RegisterDto` accepte désormais `firstName`/`lastName`/`accountType` (le contrat register était cassé avec `forbidNonWhitelisted`), `ResendCodeDto.target` validé avec `@IsIn`
- **Frontend** : sélecteur de type de compte à l'inscription, nouvelle page de gestion des sessions (`/profile/sessions`), écrans sociaux avec états désactivés si fournisseur non configuré

### Notes
- WhatsApp reste un **OTP SMS** (Africa's Talking), jamais présenté comme WhatsApp Business réel. L'intégration Meta Cloud API est repoussée hors M1.
- Les tests backend/frontend et la couverture n'ont pas pu être ré-exécutés dans l'environnement de build restreint (I/O très lent) — à relancer via `npm test` et `npm run test:e2e` sur une machine normale.

---

## Module 2 — Identité numérique (Phase M2)

### ✅ Terminé
- **Correctif sécurité (critique)** : `POST /identities/profile/verify` était un auto-verdict (tout utilisateur connecté pouvait se marquer « vérifié »). Désormais protégé par **`RolesGuard` + `@Roles(ADMIN)`** et exige une **pièce d'identité** (`identityDocumentPhoto` + `identityDocumentNumber`) avant de poser `verifiedAt` (`identities.controller.ts`, `identities.service.ts`).
- **Code mort éliminé** : `POST /identities/profile` (createProfile) renvoyait systématiquement 409 (les profils sont auto-créés à l'inscription) → désormais **idempotent** (upsert, retourne le profil existant).
- **Cohérence uploads** : retrait de `gif` des validations fichier (`file-validation.pipe.ts`) pour aligner pipe ↔ service (seuls jpeg/png/webp + pdf pour la pièce d'identité).
- **Tests** :
  - Unitaires : `identities.service.spec.ts` **29/29** (nouveaux tests : reject non-admin-verify sans document, uploads avatar/document réussis, idempotence createProfile).
  - E2E : `identities.e2e-spec.ts` couvre désormais l'upload de pièce d'identité, le **403 non-admin sur verify**, le profil public (sanitized), la validation `forbidNonWhitelisted`, et l'idempotence.
- **Frontend** : suppression du formulaire « créer » mort, ajout du champ **téléphones secondaires**, du **toggle profil public**, du **picklist type de pièce d'identité**, limite **signature corrigée à 2 Mo**, badge de vérification honnête (attente / non vérifié — plus de bouton d'auto-verification), nouveau **store `profile-store.ts`**.

### Validation exécutée (env. dev)
- `npm run build` backend ✅, `npx tsc --noEmit` ✅, frontend `next build` ✅.
- Smoke live (API bootée) : verify non-admin → **403**, createProfile idempotent → profil existant, upload GIF → **400**, upload PNG valide → **201** et fichier servi sous `/uploads`, profil public → **200** (sanitized).
- À relancer sur une machine normale (I/O sandbox) : `npm test` complet backend + `npm run test:e2e` + vitest frontend (worker spawn limité dans la sandbox).

---

## Modules suivants (planifiés)

| # | Module | Priorité | Dépend de |
|---|--------|----------|-----------|
| ~~2~~ | ~~Identité numérique~~ | ~~Haute~~ | ~~Auth~~ ✅ |
| 3 | Adresses | Haute | Identité |
| 4 | Points de repère | Haute | Auth |
| 5 | Géolocalisation & carte | Moyenne | Adresses |
| 6 | Recherche & annuaire | Moyenne | Adresses, Profils |
| 7 | QR Codes | Moyenne | Adresses |
| 8 | Profils professionnels | Moyenne | Identité |
| 9 | Livraison | Basse | Adresses, Auth |
| 10 | Services d'urgence | Basse | Géolocalisation |
| 11 | Administration | Basse | Auth |

---

## Métriques actuelles

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Tests unitaires backend | identités 29/29 validés (suite complète à re-vérifier) | >200 |
| Tests frontend | à re-vérifier (env. restreint) | >50 |
| Couverture backend (auth) | ~82% (avant M1) | 80% |
| Erreurs TypeScript (backend + frontend `tsc --noEmit`) | 0 | 0 |
| Modules backend implémentés | 22/27 | — |
