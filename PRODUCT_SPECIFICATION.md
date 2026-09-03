# BantuExpress — Spécification Produit

> **Version** : 1.0.0  
> **Dernière mise à jour** : 2026-07-29

---

## 1. Module 1 — Authentification

### 1.1 Création de compte
- Inscription par email + téléphone + mot de passe
- Validation côté client : email valide, téléphone (format +243...), mot de passe (8+ chars, majuscule, minuscule, chiffre)
- Code de vérification à 6 chiffres envoyé par email/SMS
- Renvoi du code possible (rate-limited: 3/60s)
- Connexion sociale : Google, Apple, Facebook, WhatsApp

### 1.2 Connexion
- Connexion par email OU téléphone + mot de passe
- Anti brute-force : 5 tentatives échouées → lock 15 minutes
- Journalisation des tentatives (LoginAttempt)
- 2FA optionnelle (TOTP via authenticator app)

### 1.3 Sessions
- Access token (JWT, courte durée)
- Refresh token (JWT, 7 jours) avec rotation
- Chaque refresh token est une session traçable (RefreshTokenSession)
- Révocation de session possible (logout, change-password)
- Détection de reuse de refresh token → révocation de toutes les sessions

### 1.4 Gestion du mot de passe
- Mot de passe oublié → email avec lien de réinitialisation (15 min)
- Changement de mot de passe (authentifié) → révoque toutes les sessions
- Hash scrypt (salt:hash, 64 bytes)

---

## 2. Modules planifiés

| # | Module | Statut |
|---|--------|--------|
| 1 | Authentification | **Phase 8/11** |
| 2 | Identité numérique | Planifié |
| 3 | Adresses | Planifié |
| 4 | Points de repère | Planifié |
| 5 | Géolocalisation & carte | Planifié |
| 6 | Recherche & annuaire | Planifié |
| 7 | QR Codes | Planifié |
| 8 | Profils professionnels | Planifié |
| 9 | Livraison | Planifié |
| 10 | Services d'urgence | Planifié |
| 11 | Administration | Planifié |

---

## 3. Contraintes techniques

- API REST versionnée (`/api/v1`)
- Format JSON uniforme pour les réponses
- Pagination cursor-based pour les listes
- Validation rigoureuse des entrées (class-validator)
- Taux de limitation (100 req/min/IP, plus restrictif par endpoint sensible)
- CSRF double-submit cookie pattern
- JWT pour l'authentification, stocké en localStorage (frontend)
- Base PostgreSQL 16 + PostGIS 3.4
- ORM Prisma 5
