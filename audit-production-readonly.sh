#!/usr/bin/env bash
# ============================================================================
# BantuExpress — AUDIT LECTURE SEULE de Supabase Production
# Aucune migration / aucun DDL / aucun DML. Uniquement des requêtes SELECT/SHOW.
# Usage : bash audit-production-readonly.sh
# ============================================================================
set -u
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO="$SCRIPT_DIR"
cd "$REPO"

if [ ! -f .env.production ]; then
  echo "ERREUR: .env.production introuvable"; exit 1
fi
if [ ! -d node_modules/@prisma/client ]; then
  echo "ERREUR: prisma client absent (lancer: npm install)"; exit 1
fi

# --- Chargement cible production (jamais affichée en clair) -----------------
export DATABASE_URL
export DIRECT_URL
DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' .env.production | head -1 | tr -d '"')
DIRECT_URL=$(sed -n 's/^DIRECT_URL=//p' .env.production | head -1 | tr -d '"')

echo "PRODUCTION TARGET:"
echo "  Supabase PostgreSQL"
echo "  Port: 5432 (DIRECT_URL / session directe)"
echo "  Mode: READ-ONLY AUDIT"
echo ""

export AUDIT_REPO_MIGRATIONS_DIR="$REPO/prisma/migrations"

node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: [],
  datasources: { db: { url: process.env.DIRECT_URL } },
});

function maskHost(u) {
  try {
    const x = new URL(u);
    const parts = x.hostname.split('.');
    const tld = parts.slice(-2).join('.');
    return `***.${tld}`;
  } catch { return '***'; }
}
function parsePort(u) {
  try { const x = new URL(u); return x.port || 5432; } catch { return '?'; }
}
function maskUrl(u) {
  return { hote: maskHost(u), port: parsePort(u) };
}

(async () => {
  console.log('IDENTIFICATION CIBLE');
  console.log('  DATABASE_URL :', JSON.stringify(maskUrl(process.env.DATABASE_URL)));
  console.log('  DIRECT_URL   :', JSON.stringify(maskUrl(process.env.DIRECT_URL)));
  const info = [];
  const cmds = {
    version:     `SELECT version()`,
    dbname:      `SELECT current_database() AS db, current_schema() AS sch`,
    extensions:  `SELECT extname, extversion FROM pg_extension ORDER BY extname`,
    migrations:  `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY migration_name`,
    tables:      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
    postgis:     `SELECT postgis_version()`,
    geomcols:    `SELECT f_table_name, f_geometry_column, type, srid FROM geometry_columns ORDER BY f_table_name, f_geometry_column`,
    gistidx:     `SELECT i.tablename AS tbl, i.indexname AS idx FROM pg_indexes i JOIN pg_class c ON i.indexname=c.relname JOIN pg_am am ON c.relam=am.oid WHERE am.amname='gist' ORDER BY i.tablename`,
  };
  for (const [name, sql] of Object.entries(cmds)) {
    try {
      const rows = await prisma.$queryRawUnsafe(sql);
      info[name] = rows;
      const n = Array.isArray(rows) ? rows.length : 0;
      console.log(`\n[${name}] rows=${n}`);
      if (name === 'version')       console.log('  ', String(rows[0].version).split('\n')[0]);
      if (name === 'dbname')        console.log('   db =', rows[0].db, '| schema =', rows[0].sch);
      if (name === 'extensions')    rows.forEach(r => console.log(`   ${r.extname} ${r.extversion}`));
      if (name === 'migrations')    rows.forEach(r => console.log(`   ${r.migration_name}  start=${r.started_at ? r.started_at.toISOString() : '?'}  fin=${r.finished_at ? r.finished_at.toISOString() : 'PAS TERMINÉE'}  rollback=${r.rolled_back_at ? 'OUI' : 'non'}  steps=${r.applied_steps_count}`));
      if (name === 'tables')        rows.forEach(r => console.log(`   ${r.table_name}`));
      if (name === 'postgis')       console.log('   ', rows[0].postgis_version);
      if (name === 'geomcols')      rows.forEach(r => console.log(`   ${r.f_table_name}.${r.f_geometry_column}  ${r.type}  srid=${r.srid}`));
      if (name === 'gistidx')       rows.forEach(r => console.log(`   ${r.tbl}  INDEX ${r.idx}`));
    } catch (e) {
      info[name] = null;
      console.log(`\n[${name}] ERREUR/ABSENT: ${e.meta?.code || e.message}`);
    }
  }
  // --- Comparaison migrations dépôt vs production --------------------------
  const repoDir = process.env.AUDIT_REPO_MIGRATIONS_DIR;
  let repo = [];
  try {
    repo = fs.readdirSync(repoDir).filter(d => /^\d{3}/.test(d)).sort();
  } catch (e) { console.log('WARN dépôt migrations illisible:', e.message); }
  const applied = new Set((info.migrations || []).map(r => r.migration_name));
  console.log('\nCOMPARATIF MIGRATIONS');
  console.log('  dépôt (présentes localement) :', repo.length);
  console.log('  production (appliquées)       :', applied.size);
  repo.forEach(m => {
    console.log(`  [${applied.has(m) ? 'APPLIQUÉE' : 'NON APPLIQUÉE'}] ${m}  (dépôt: OUI / prod: ${applied.has(m) ? 'OUI' : 'NON'})`);
  });
  (info.migrations || []).forEach(r => {
    if (!repo.includes(r.migration_name)) {
      console.log(`  [DÉPÔT: NON] ${r.migration_name} (présente en prod, PAS dans le dépôt)`);
    }
  });
  await prisma.$disconnect();
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
NODE