#!/bin/sh
# database-init/1-init-user.sh  — แทน 1-init-user.sql เดิม (สิทธิ์เหมือนเดิมทุกอย่าง)
# ต่างกันที่: รหัสผ่านอ่านจาก APP_DB_PASSWORD ใน .env.db ไม่ได้เขียนตรงในไฟล์ (ไม่หลุดเข้า git)
# รัน "ครั้งเดียว" ตอนสร้างฐานข้อมูลเปล่าครั้งแรก — ก่อนไฟล์ 2_backup_*.sql (เรียงตามชื่อ)
set -e
: "${APP_DB_PASSWORD:?ต้องตั้ง APP_DB_PASSWORD ใน .env.db}"

psql -v ON_ERROR_STOP=1 -v app_pw="$APP_DB_PASSWORD" -v dbname="$POSTGRES_DB" \
     --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
-- สร้าง User สำหรับแอปพลิเคชัน
CREATE USER app_user WITH PASSWORD :'app_pw';

-- สิทธิ์เชื่อมต่อ Database
GRANT CONNECT ON DATABASE :"dbname" TO app_user;

-- สิทธิ์เข้าถึงโครงสร้างและตาราง แบบจำกัด (CRUD)
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- สิทธิ์ครอบคลุมตารางที่จะสร้างใหม่ในอนาคต (รวมตารางที่ 2_backup_*.sql สร้างต่อจากนี้)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
EOSQL
