-- สร้าง User ใหม่สำหรับแอปพลิเคชัน
CREATE USER app_user WITH PASSWORD 'p@ssword';

-- ให้สิทธิ์เชื่อมต่อ Database ชื่อ ww_sys
GRANT CONNECT ON DATABASE ww_sys TO app_user;

-- ให้สิทธิ์การเข้าถึงโครงสร้างและตารางต่างๆ แบบจำกัด (CRUD)
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ให้สิทธิ์ครอบคลุมถึงตารางที่จะสร้างใหม่ในอนาคตด้วย
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;