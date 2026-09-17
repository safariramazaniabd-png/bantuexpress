#!/usr/bin/env bash
# Diagnostic de connexion Supabase PRODUCTION (sans afficher les secrets).
# Usage : bash check-migrations-prod.sh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO="$SCRIPT_DIR"
cd "$REPO"

echo "== Structure des URLs (masquee : mot de passe/host censures) =="
python3 - <<'EOF'
import re
for l in open('.env.production'):
    l=l.strip()
    if not l.startswith(('DATABASE_URL=','DIRECT_URL=')): continue
    k,v=l.split('=',1); v=v.split('#')[0].strip().strip('"')
    m=re.match(r'postgres(?:ql)?://([^@:/]+):([^@/]*)@([^:/@]+):(\d+)(/[^?]+)?(\?.*)?$', v)
    if not m:
        print(f"{k}: FORMAT INCORRECT -> {v[:25]}...")
        continue
    user, _, host, port, dbb, qs = m.groups()
    tld2='.'.join(host.split('.')[-2:])
    print(f"{k}: user={user[:6]}... port={port} db={(dbb or '').lstrip('/')} host=*{tld2} pgbouncer={'pgbouncer=true' in (qs or '')}")
    print(f"   -> attendu: DATABASE_URL=6543+pgbouncer=true (Transaction Pooler) | DIRECT_URL=5432 (Session Pooler)")
EOF

echo ""
echo "== Resolution DNS du host (host masque) =="
for var in DATABASE_URL DIRECT_URL; do
  val=$(grep "^${var}=" .env.production | sed 's/^[^=]*=//' | sed 's/^"//;s/"$//')
  host=$(python3 -c "from urllib.parse import urlparse; import sys; print(urlparse(sys.argv[1]).hostname or '')" "$val")
  [ -z "$host" ] && echo "$var : host manquant" && continue
  tld1="${host##*.}"
  echo "$var : host=*${tld1}"
  if command -v getent >/dev/null 2>&1; then getent hosts "$host" | awk '{print "   DNS OK ->", $1}' | head -3 || echo "   DNS ECHEC (ENOTFOUND)"; fi
  ns=$(command -v nc || command -v ncat || echo "")
  if [ -n "$ns" ]; then
    for p in 5432 6543; do
      if timeout 5 "$ns" -zv "$host" "$p" >/dev/null 2>&1; then echo "   port $p : OUVERT"; else echo "   port $p : FERME/BLOQUE"; fi
    done
  else
    echo "   (nc non installe - test port saute)"
  fi
done

echo ""
echo "== Test Prisma (lecture seule) =="
set -a
eval "$(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env.production | sed 's/^/export /')"
set +a
npx prisma migrate status 2>&1 | head -12