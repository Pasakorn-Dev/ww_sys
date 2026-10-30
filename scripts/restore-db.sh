#!/usr/bin/env bash
# กู้คืนฐานข้อมูลจากไฟล์ dump   ใช้:  ./scripts/restore-db.sh ww_sys.dump   (หรือไฟล์ .sql)
# รันที่ root โปรเจกต์ (โฟลเดอร์เดียวกับ docker-compose.yml)  — ใช้กับ DB เปล่าเท่านั้น
set -euo pipefail
DUMP="${1:?ระบุไฟล์ dump เช่น ./scripts/restore-db.sh ww_sys.dump}"
[ -f "$DUMP" ] || { echo "ไม่พบไฟล์ $DUMP"; exit 1; }

set -a; . ./.env.db; set +a

docker compose up -d postgres-db
echo "รอ Postgres พร้อม..."
until docker compose exec -T postgres-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do sleep 2; done

case "$DUMP" in
  *.sql)
    docker compose exec -T postgres-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$DUMP" ;;
  *)
    # --no-owner/--no-privileges: ไม่พยายามสร้างเจ้าของเดิมที่ไม่มีบนเครื่องใหม่
    docker compose exec -T postgres-db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      --no-owner --no-privileges --exit-on-error < "$DUMP" ;;
esac

echo "--- ตรวจผล: จำนวนตารางใน schema public"
docker compose exec -T postgres-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "select count(*) from information_schema.tables where table_schema='public';"
echo "เสร็จ — ต่อไป: docker compose up -d"
