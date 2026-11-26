---
trigger: glob
globs:
  - "database-init/**"
  - "**/*.sql"
description: "มาตรฐานการเขียน SQL และจัดการฐานข้อมูล PostgreSQL"
---

# Database Rules (`database-init` & SQL)
- ใช้ไวยากรณ์ของ PostgreSQL เท่านั้น
- คำสั่งสร้างหรือปรับโครงสร้างตารางต้องรันซ้ำได้โดยไม่พัง (ใช้ `IF NOT EXISTS` / `IF EXISTS` ให้เหมาะสม)
- ห้ามเขียนคำสั่ง `DROP TABLE`, `TRUNCATE` หรือ `DELETE` แบบไม่มี `WHERE` โดยไม่ได้รับคำสั่งชัดเจน
- หากต้องบันทึกหรืออัปเดตหลายตารางพร้อมกัน ให้ครอบด้วย Transaction (`BEGIN ... COMMIT / ROLLBACK`)