-- SQL
-- สร้าง User ใหม่สำหรับแอปพลิเคชัน (ห้ามเป็น Superuser)
CREATE USER superuser WITH PASSWORD 'p@ssw0rd';

-- ให้สิทธิ์เชื่อมต่อ Database ชื่อ mydb
GRANT CONNECT ON DATABASE ww_sys TO superuser;

-- สลับการทำงานเข้าไปที่ mydb
\c ww_sys

-- ให้สิทธิ์การเข้าถึงโครงสร้างและตารางต่างๆ แบบจำกัด (CRUD)
GRANT USAGE ON SCHEMA public TO superuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO superuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO superuser;

-- ให้สิทธิ์ครอบคลุมถึงตารางที่จะสร้างใหม่ในอนาคตด้วย
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO superuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO superuser;

