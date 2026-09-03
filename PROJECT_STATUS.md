# BantuExpress — État du Projet

> **Dernière mise à jour** : 2026-09-02 (M1 — création de compte)

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

## Modules suivants (planifiés)

| # | Module | Priorité | Dépend de |
|---|--------|----------|-----------|
| 2 | Identité numérique | Haute | Auth |
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
| Tests unitaires backend | à re-vérifier (env. restreint) | >200 |
| Tests frontend | à re-vérifier (env. restreint) | >50 |
| Couverture backend (auth) | ~82% (avant M1) | 80% |
| Erreurs TypeScript (backend `tsc --noEmit`) | 0 | 0 |
| Modules backend implémentés | 21/27 | — |
