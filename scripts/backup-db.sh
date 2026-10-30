#!/usr/bin/env bash
# สำรองฐานข้อมูล (เก็บ 14 วัน)   ใช้:  ./scripts/backup-db.sh
# ตั้งอัตโนมัติทุกคืน 02:00 →  crontab -e  แล้วเพิ่ม:
#   0 2 * * * cd /opt/ww_sys && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.db; set +a
mkdir -p backups
OUT="backups/${POSTGRES_DB}_$(date +%F_%H%M).dump"
docker compose exec -T postgres-db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$OUT"
find backups -name '*.dump' -mtime +14 -delete
echo "สำรองแล้ว: $OUT ($(du -h "$OUT" | cut -f1))"
