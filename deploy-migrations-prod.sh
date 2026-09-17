#!/usr/bin/env bash
set -euo pipefail

# Deploiement des migrations Prisma vers la base Supabase PRODUCTION.
# Utilise les vraies chaines de connexion de .env.production.
# NE PAS lancer depuis un reseau isole (ex: sandbox) ni depuis la prod Vercel sans acces direct.
#
# Usage :  bash deploy-migrations-prod.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO="$SCRIPT_DIR"
cd "$REPO"

# Charge DATABASE_URL et DIRECT_URL depuis .env.production, sans les afficher.
set -a
eval "$(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env.production | sed 's/^/export /')"
set +a

echo "== Cible de connexion (doit etre Supabase/pooler, PAS localhost) =="
echo "ATTENTION : cette operation cible SUPABASE PRODUCTION."
read -r -p "Tapez DEPLOY-PRODUCTION pour continuer : " confirmation
if [[ "$confirmation" != "DEPLOY-PRODUCTION" ]]; then
  echo "Deploiement annule : confirmation invalide." >&2
  exit 1
fi
npx prisma migrate deploy

echo ""
echo "== Vérification finale =="
npx prisma migrate status