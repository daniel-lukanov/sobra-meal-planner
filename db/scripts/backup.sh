#!/usr/bin/env bash
# Full backup of the pratico Supabase database, taken before the savings-check pivot.
#   bash db/scripts/backup.sh
# Needs: pg_dump 17 or newer (brew install libpq && brew link --force libpq) and SUPABASE_DB_URL in db/.env
# (Supabase dashboard > Connect > Session pooler connection string, with your database password filled in).
# Writes to db/backups/<timestamp>/ which git ignores: the dump holds user emails, never commit it.
set -euo pipefail
cd "$(dirname "$0")/../.."
URL=$(grep -E '^SUPABASE_DB_URL=' db/.env | head -1 | cut -d= -f2- || true)
[ -n "$URL" ] || { echo "Add SUPABASE_DB_URL=postgresql://... to db/.env (a line of its own), then rerun."; exit 1; }
command -v pg_dump >/dev/null || { echo "pg_dump not found. Run: brew install libpq && brew link --force libpq"; exit 1; }
OUT="db/backups/$(date +%Y%m%d-%H%M)"; mkdir -p "$OUT"
echo "pg_dump $(pg_dump --version | awk '{print $3}') -> $OUT"
# 1) structure of our tables, views and functions
pg_dump "$URL" --schema-only --no-owner --no-privileges -n public -f "$OUT/schema_public.sql"
# 2) all rows: our data, the accounts (auth) and the storage index of recipe images
pg_dump "$URL" --data-only --no-owner --no-privileges -n public -n auth -n storage -f "$OUT/data.sql"
# 3) the same in pg_dump's own format, for a one-command restore into an empty project
pg_dump "$URL" --format=custom --no-owner --no-privileges -n public -n auth -n storage -f "$OUT/full.dump"
git rev-parse HEAD > "$OUT/git_commit.txt"
for t in recipe product promotion ingredient; do
  printf '%-12s %s rows\n' "$t" "$(psql "$URL" -Atc "select count(*) from public.$t" 2>/dev/null || echo '?')"
done | tee "$OUT/row_counts.txt"
ls -lh "$OUT"
echo "Done. Restore (into a fresh, empty project only): pg_restore --no-owner --clean --if-exists -d \"<new db url>\" $OUT/full.dump"
