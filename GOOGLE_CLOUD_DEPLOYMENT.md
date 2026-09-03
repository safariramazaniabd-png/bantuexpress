# BantuExpress — Déploiement sur Google Cloud (Cloud Run + Cloud SQL + PostGIS)

Guide opérationnel, étape par étape, pour déployer l'API NestJS BantuExpress sur
**Google Cloud Run** avec une base **Cloud SQL PostgreSQL + PostGIS**, le tout géré
par **Prisma**.

> **N'activez aucune étape destructive sans validation.** Toutes les commandes
> ci-dessous sont fournies telles qu'elles s'exécutent dans `gcloud`/`docker`.
> Remplacez les valeurs entre `[CROCHETS]` (`[PROJECT_ID]`, `[REGION]`, …) par
> les vôtres. **Ne committez jamais de secret.**

---

## 1. Prérequis

- Compte Google Cloud avec facturation (un projet Cloud Run + Cloud SQL a un coût, voir §17).
- CLI `gcloud` installée et authentifiée : `gcloud auth login`
- `docker` installé (build de l'image) : `docker --version`
- Node.js ≥ 20 (build local du backend) : `node --version`
- `prisma` (déjà présent en devDependencies) : `npx prisma --version`

Vérifier l'accès :

```bash
gcloud config list
gcloud auth list
```

---

## 2. Création du projet Google Cloud

```bash
export PROJECT_ID="[PROJECT_ID]"        # ex: bantuexpress-prod
export REGION="[REGION]"                # ex: europe-west1

gcloud projects create "$PROJECT_ID" --name="BantuExpress"
gcloud config set project "$PROJECT_ID"
```

> Définissez ces deux variables dans votre shell ; toutes les commandes suivantes
> les utilisent.

---

## 3. Activation des APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

---

## 4. Cloud SQL — instance PostgreSQL

Créer une instance Cloud SQL PostgreSQL (privée de préférence) :

```bash
export INSTANCE_NAME="bantuexpress-db"
export DB_NAME="bantuexpress"
export DB_USER="bantuexpress"

# Mot de passe via variable shell (jamais en clair dans l'historique)
read -s -p "Mot de passe base de données: " DB_PASSWORD

gcloud sql instances create "$INSTANCE_NAME" \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --root-password="$DB_PASSWORD" \
  --no-assign-ip \
  --availability-type=zonal \
  --storage-size=10GB \
  --storage-auto-increase

# Base de données applicative
gcloud sql databases create "$DB_NAME" \
  --instance="$INSTANCE_NAME"

# Utilisateur applicatif (limité à cette base)
gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$DB_PASSWORD"
```

**Raccordement Cloud Run ↔ Cloud SQL** : on utilisera le connecteur Cloud SQL
(`--add-cloudsql-instances`) qui crée un tunnel géré et sécurisé (pas d'IP publique).
L'URL de connexion sera composée à l'étape §11 à partir du *connection name* :

```bash
gcloud sql instances describe "$INSTANCE_NAME" \
  --format='value(connectionName)'   # ex: PROJECT:REGION:INSTANCE
```

---

## 5. PostgreSQL — extensions PostGIS et uuid-ossp

Les extensions `postgis` et `uuid-ossp` sont **nativement supportées par Cloud SQL
PostgreSQL** (aucun paquet à installer côté serveur). Elles sont déclarées dans
`prisma/schema.prisma` (`extensions = [postgis, uuid_ossp]`) et créées par la
migration `001_initial_schema`.

Pour créer les extensions sur une base Cloud SQL existante (si la migration ne
l'a pas déjà fait), connectez-vous avec un utilisateur superutilisateur
(`cloudsqlsuperuser`, ex. `postgres`) :

```bash
gcloud sql connect "$INSTANCE_NAME" --user=postgres --database="$DB_NAME"
```

```sql
-- Dans psql (optionnel si la migration 001 s'exécute, elle le fait déjà)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS uuid_ossp;
SELECT postgis_version();           -- doit répondre 3.x
```

> **Important** : à la création, un utilisateur non-superutilisateur ne peut pas
> créer d'extensions. Les extensions sont créées par la **super* utilisateur `postgres`**
> (premier **migrate deploy** en tant que `postgres`), ou pré-créées via la commande
> ci-dessus. Ensuite l'utilisateur `bantuexpress` peut utiliser les types.

---

## 6. Prisma — génération client et migrations

En local, vérifier que tout est cohérent :

```bash
npm ci
npx prisma validate            # schéma valide
npx prisma generate            # génère le client dans node_modules/.prisma
npm run build                  # compile NestJS dans dist/
```

Migration : le **build Docker** ne doit jamais lancer `prisma migrate dev`.

- En **développement** : `npx prisma migrate dev` (créé/auto-applique).
- En **production / Cloud Run** : `npx prisma migrate deploy` (applique les
  `prisma/migrations/*` vérifiées, non destructif, pas de shadow database).

La commande de deployment est exécutée **avant** le démarrage de l'API, dans un
job de démarrage Cloud Run (voir §13) ou en CI.

Catégories de migrations actuelles :

| Migration | Contenu |
|---|---|
| `001_initial_schema` | `CREATE EXTENSION postgis` + `uuid_ossp`, enums, tables |
| `002_baseline` | marqueur de baseline |
| `003_postgis_geometry` | colonnes `geography(Point,4326)`, index GIST, triggers de synchro |
| `004_fts_search` | full-text search (tsvector + GIN) |

---

## 7. Docker — image de production

Le `Dockerfile` est un build multi-étages **correct** :

1. `deps` : `npm ci` (toutes les dépendances, dont dev, nécessaires au build) ;
2. `builder` : `prisma generate` + `npm run build` ;
3. `runner` : réutilise `node_modules`, `npm prune --omit=dev`, utilisateur non-root `nestjs`.

Points contrôlés :
- Écoute sur `0.0.0.0` (voir `src/main.ts`) et port via `process.env.PORT` ;
- `NODE_ENV=production` ;
- Utilisateur **non-root** (`nestjs`, uid 1001) ;
- Healthcheck `/health` ;
- `prisma/` copié pour `prisma migrate deploy` ;
- `.dockerignore` exclut `node_modules`, `.env`, `dist`, `frontend`, `coverage`, etc.

Construire l'image (vérification) :

```bash
docker build -t bantuexpress-api:local .
```

---

## 8. Artifact Registry — dépôt d'images

Créer le dépôt et préparer les variables d'image :

```bash
ARTIFACT_REGION="europe-west1"
IMAGE="$ARTIFACT_REGION-docker.pkg.dev/$PROJECT_ID/bantuexpress/api"

gcloud artifacts repositories create bantuexpress \
  --repository-format=docker \
  --location="$ARTIFACT_REGION" \
  --description="BantuExpress API images"

# Authentification docker auprès d'Artifact Registry
gcloud auth configure-docker "$ARTIFACT_REGION-docker.pkg.dev"
```

---

## 9. Build, tag, push de l'image

```bash
docker build -t "$IMAGE:latest" .
docker tag "$IMAGE:latest" "$IMAGE:$TAG"        # TAG ex: v1.0.0 ou hash de build

docker push "$IMAGE:latest"
docker push "$IMAGE:$TAG"
```

Le `build` peut aussi être fait dans **Cloud Build** (aucun Docker local requis) :

```bash
gcloud builds submit --tag "$IMAGE:$TAG" .
```

---

## 10. Secret Manager — secrets d'environnement

Ne stockez **jamais** les secrets dans le code ni dans les commandes `--update-env-vars`.
Utilisez **Secret Manager** :

```bash
# Mot de passe DB
printf '%s' "$DB_PASSWORD" | \
  gcloud secrets create DATABASE_PASSWORD --data-file=- \
  --replication-policy=automatic

# JWT
printf '%s' "$(openssl rand -hex 64)" | \
  gcloud secrets create JWT_SECRET --data-file=- --replication-policy=automatic

# CSRF
printf '%s' "$(openssl rand -hex 32)" | \
  gcloud secrets create CSRF_SECRET --data-file=- --replication-policy=automatic

# Providers (optionnels) — Resend / Africa's Talking / Sentry
printf '%s' "$RESEND_API_KEY" | gcloud secrets create RESEND_API_KEY --data-file=-
printf '%s' "$AT_API_KEY"     | gcloud secrets create AT_API_KEY --data-file=-
printf '%s' "$SENTRY_DSN"     | gcloud secrets create SENTRY_DSN --data-file=-
```

---

## 11. Cloud Run — déploiement

Composer la `DATABASE_URL` à partir du *connection name* Cloud SQL :

```bash
CONNECTION_NAME="$(gcloud sql instances describe $INSTANCE_NAME --format='value(connectionName)')"
# DATABASE_URL = postgresql://USER:PASSWORD@/DB?host=/cloudsql/CONNECTION_NAME
```

> Avec le connecteur Cloud SQL (`--add-cloudsql-instances`), Prisma se connecte
> via un socket Unix local dans `/cloudsql/$CONNECTION_NAME/.s.PGSQL.5432`.
> Le format `postgresql://USER:PW@/DB?host=/cloudsql/CONNECTION_NAME`
> est le format Prisma compatible avec ce socket.

Déployer le service Cloud Run :

```bash
gcloud run deploy bantuexpress \
  --image="$IMAGE:latest" \
  --platform=managed \
  --region="$REGION" \
  --cpu=1 --memory=512Mi \
  --min-instances=0 --max-instances=10 \
  --concurrency=80 \
  --timeout=60s \
  --allow-unauthenticated \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --service-account="[SAURE@$PROJECT_ID.iam.gserviceaccount.com]" \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://$DB_USER@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME,JWT_EXPIRATION=3600s,FRONTEND_URL=https://app.bantuexpress.com,CORS_ORIGIN=https://app.bantuexpress.com" \
  --set-secrets="DATABASE_PASSWORD=DATABASE_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest,CSRF_SECRET=CSRF_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,AT_API_KEY=AT_API_KEY:latest,SENTRY_DSN=SENTRY_DSN:latest"
```

**Important — mot de passe DB :** la `DATABASE_URL` ci-dessus place le mot de passe
dans une variable lisible en clair. Préférez construire l'URL à l'exécution, ou
référencer le secret via Secret Manager dans le connecteur. La méthode la plus
simple et sûre :

- fournir `DATABASE_URL` **sans mot de passe** : `postgresql://$DB_USER@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME`
- et utiliser l'**authentification IAM** de Cloud SQL pour Cloud Run (service account
  membre du rôle `cloudsql.iamUser` + base avec IAM auth). Voir §12.

---

## 12. Connecting Cloud Run → Cloud SQL (méthode sécurisée)

**Option A — Cloud SQL Auth Proxy/Connecteur + authentification IAM (recommandée) :**

```bash
# Activer l'authentification IAM sur l'instance
gcloud sql instances patch "$INSTANCE_NAME" --database-flags cloudsql.iam_authentication=on

# Créer un utilisateur IAM dans la base (nom = email du SA Cloud Run)
RESOURCE_SA="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
gcloud sql users create "$RESOURCE_SA" \
  --instance="$INSTANCE_NAME" --type=cloud_iam_service_account

# Accorder le rôle de connexion à la base à la SA
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RESOURCE_SA" \
  --role="roles/cloudsql.instanceUser"

# Accorder le droit d'utiliser le connecteur
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RESOURCE_SA" \
  --role="roles/cloudsql.client"
```

Puis `DATABASE_URL` **sans mot de passe** (IAM gère l'authentification) :

```
DATABASE_URL="postgresql://<SA_NAME>@<PROJECT_ID>.iam@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME"
```

**Option B — identifiants classiques (si IAM non utilisé) :**

Stockez la `DATABASE_URL` complète dans Secret Manager et référencez-la :

```bash
printf '%s' "postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME" | \
  gcloud secrets create DATABASE_URL_PROD --data-file=-

# Déploiement avec secret DATABASE_URL pointé depuis Secret Manager
# --set-secrets="DATABASE_URL=DATABASE_URL_PROD:latest,..."
```

Récupérer l'URL du service :

```bash
gcloud run services describe bantuexpress \
  --region="$REGION" --format='value(status.url)'
```

---

## 13. Migration à chaque déploiement

Avant (ou au démarrage de) chaque nouvelle révision, appliquez les migrations de
façon **non destructive** :

```bash
# Depuis une machine avec accès au socket /cloudsql (ou via le job ci-dessous)
npx prisma migrate deploy
```

Approche recommandée sur Cloud Run : un **job Cloud Run** exécutant `migrate deploy`
avant la mise à jour du service :

```bash
gcloud run jobs create bantuexpress-migrate \
  --image="$IMAGE:migrate" \
  --region="$REGION" \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --set-env-vars="DATABASE_URL=..." \
  --set-secrets="DATABASE_URL=DATABASE_URL_PROD:latest"
```

Où l'image `migrate` lance `npx prisma migrate deploy` (voir Dockerfile : le
dossier `prisma/` est inclus). Ne passez **jamais** `migrate dev`/`reset` en prod.

---

## 14. Variables d'environnement — référence

| Variable | Requis | Description |
|---|---|---|
| `PORT` | non | Port HTTP (Cloud Run l'injecte). Défaut `3000`. |
| `NODE_ENV` | **oui** | `production` en prod. |
| `DATABASE_URL` | **oui** | Connexion PostgreSQL (Cloud SQL via socket §11/12). |
| `JWT_SECRET` | **oui** | Secret JWT (Secret Manager). Refus au boot si absent en prod. |
| `JWT_EXPIRATION` | **oui** | Durée du token, ex. `3600s`. |
| `CSRF_SECRET` | **oui (prod)** | Secret CSRF. **Obligatoire en production** (validation au boot). |
| `CORS_ORIGIN` | non | Origine(s) frontend. Vide = toutes origines (dev). |
| `FRONTEND_URL` | non | URL du frontend pour les liens email. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | non | Email transactionnel. |
| `AT_API_KEY` / `AT_USERNAME` / `AT_SENDER_ID` | non | SMS (Africa's Talking). |
| `SENTRY_DSN` | non | Erreurs Sentry. |

> `env.validation.ts` refuse de booter si une variable obligatoire manque.

---

## 15. Tests

**Unitaires (362 tests, 31 suites) :**

```bash
npm test                 # jest (+ seuil de couverture global 80%)
```

**E2E (si une base de test est disponible) :**

```bash
npm run test:e2e
```

**Sonde de santé / readiness :**

```bash
curl -s https://[URL]/health
# { "status":"ok","db":"up","dbLatencyMs":X,"uptime":Y,"timestamp":"..." }
#   status "degraded" + db "down" = API OK mais base injoignable → vérifier Cloud SQL
```

**Commande rapide après déploiement :**

```bash
HEALTH=$(gcloud run services describe bantuexpress --region=$REGION --format='value(status.url)')
curl -sf "$HEALTH/health" && echo " OK"
```

---

## 16. Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bantuexpress" \
  --limit=100

# Logs temps réel
gcloud run services logs tail bantuexpress --region="$REGION"

# Logs Cloud SQL
gcloud logging read 'resource.type=cloudsql_database AND logName:"postgres.log"' --limit=50
```

L'API journalise ses erreurs via le logger NestJS ; l'enrichissement Sentry est
activé si `SENTRY_DSN` est défini.

---

## 17. Coûts à surveiller

- **Cloud SQL PostgreSQL** : facturé à l'heure (instance `db-f1-micro` ~ faible)
  + stockage + sauvegardes. **Arrêtez l'instance hors production** pour réduire
  les coûts (elle reprend au besoin des sauvegardes).
- **Cloud Run** : facturé à l'usage (CPU/mémoire * temps d'instance). `--min-instances=0`
  éteint les instances inactives sur 15 s.
- **Artifact Registry** : stockage des images (~ peu si on nettoie les vieux tags).
- **Secret Manager** : gratuit en dessous de seuils (6 000 accès/mois).

Astuce : gardez `--min-instances=0` et un `--max-instances` bas en staging.

---

## 18. Rollback

Cloud Run conserve les révisions. Retour en arrière immédiat :

```bash
# Lister les révisions
gcloud run revisions list --service=bantuexpress --region="$REGION"

# Pointer le service sur une révision précédente saine
gcloud run services update-traffic bantuexpress \
  --to-revisions="bantuexpress-00012-mir=100" \
  --region="$REGION"

# Ou redéployer un tag image précédent
gcloud run deploy bantuexpress --image="$IMAGE:PREV_TAG" --region="$REGION" ...
```

Pour la base : Cloud SQL dispose de **sauvegardes automatisées** et du
**point-in-time recovery** (PITR) si activé. Restauration :

```bash
gcloud sql backups list --instance="$INSTANCE_NAME"
gcloud sql backups restore BACKUP_ID --restore-instance="$INSTANCE_NAME"
```

---

## 19. Commandes de maintenance

```bash
# Connecter un client psql au Cloud SQL
gcloud sql connect "$INSTANCE_NAME" --user=postgres --database="$DB_NAME"

# Stats PostGIS
gcloud sql connect "$INSTANCE_NAME" --user=postgres --database="$DB_NAME" \
  -e "SELECT postgis_version(); SELECT count(*) FROM geometry_columns;"

# Redémarrer l'instance
gcloud sql instances restart "$INSTANCE_NAME"

# Mise à l'échelle manuelle de Cloud Run
gcloud run services update bantuexpress --concurrency=100 --max-instances=20 --region="$REGION"

# Mettre à jour un secret et redéployer
gcloud secrets versions add JWT_SECRET --data-file=<(openssl rand -hex 64)
gcloud run deploy bantuexpress --image="$IMAGE:latest" --region="$REGION"
```

---

## 20. Sécurité — bonnes pratiques

- **Secrets** : jamais dans le code, le `.env`, le Dockerfile, ni les logs. Utiliser
  Secret Manager + références `--set-secrets`.
- **CSRF** : obligatoire en production (`CSRF_SECRET` requis, refus au boot sinon).
- **CORS** : définir `CORS_ORIGIN` sur l'origine frontend réelle (pas `*`).
- **Helmet** : déjà activé (`src/main.ts`).
- **Rate limiting** : `ThrottlerGuard` (100 requêtes/min/IP) déjà actif globalement.
- **Utilisateur non-root** dans l'image (`nestjs`).
- **Validation** : `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`).
- **SQL** : Prisma paramétrise ; les `$queryRawUnsafe` géospatiaux sont construits
  avec valeurs injectées via Prisma (pas de concaténation directe d'entrées non
  échappées) — à surveiller lors des revues de code.
- **IAM** : privilégier l'authentification IAM Cloud SQL (Option A, §12) plutôt
  qu'un mot de passe en clair.
- **Réseau** : Cloud SQL sans IP publique (`--no-assign-ip`) + connecteur Cloud Run.

---

## 21. Offline-First — préservation

Le déploiement Cloud n'altère **pas** la logique Offline-First : le backend Cloud
est la partie **serveur/synchronisation** ; le client conserve sa logique locale.
Les modules `sync` (`POST /api/v1/sync/push`, `GET /api/v1/sync/pull`) fournissent
la synchronisation différée. Ne supprimez aucun de ces contrats.

---

## 22. Récapitulatif du flux

```
[Client] → Cloud Run (NestJS API) → Cloud SQL Proxy → Cloud SQL (PostgreSQL+PostGIS)
                ↓ déploiement : Docker → Artifact Registry → Cloud Run
                ↓ données : Prisma (client généré) + migrations `migrate deploy`
                ↓ géo : PostGIS (geography(Point,4326), ST_DWithin, GIST)
```
