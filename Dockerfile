# ============================================================================
# BantuExpress — Image de production (Docker / Artifact Registry / Cloud Run)
#
# 3 stages :
#   deps    : installe TOUTES les dépendances (dont dev, nécessaires au build)
#   builder : génère Prisma Client + compile l'application NestJS
#   runner  : installe uniquement les dépendances de production, image minimale
#
# Voir GOOGLE_CLOUD_DEPLOYMENT.md pour le build/tag/push/deploy.
# ============================================================================

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./

# On installe TOUTES les dépendances ici : @nestjs/cli et typescript sont des
# devDependencies indispensables à la compilation (nest build) dans le builder.
RUN npm ci

# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Génère le Prisma Client (requis à l'exécution) depuis le runner
RUN npx prisma generate

# Compile l'application dans dist/
RUN npm run build

# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# On réutilise le node_modules complet du builder (contenant le Prisma Client
# généré et ses engines pour node:20-alpine/musl), puis on retire les
# devDependencies pour une image d'exécution minimale. Cette approche évite un
# second `npm ci` réseau complet et garantit la présence exacte du client
# Prisma produit par `prisma generate`.
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev

# Artefacts de l'application compilée + schéma/migrations Prisma (nécessaires
# au `prisma migrate deploy` et à la présence du client Prisma généré).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

USER nestjs

# Cloud Run fournit son propre PORT via la variable d'environnement PORT.
# EXPOSE n'est qu'informatif ; NestJS écoute sur 0.0.0.0 (voir src/main.ts).
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/main"]
