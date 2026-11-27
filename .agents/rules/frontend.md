---
trigger: glob
globs:
  - "ww-frontend/**"
description: "มาตรฐานโค้ดสำหรับฝั่ง Frontend (React + Vite + Tailwind CSS)"
---

# Frontend Rules (`ww-frontend`)
- ใช้ React (Functional Components + Hooks), Vite และ Tailwind CSS ตามโครงสร้างเดิมของโปรเจกต์
- แยก Component ให้มีขนาดพอดี อ่านง่าย หลีกเลี่ยงการยัดทุกอย่างไว้ในไฟล์เดียว
- เรียก API ผ่าน service/axios instance ที่มีอยู่เดิม ห้าม hardcode URL ให้ดึงจาก `import.meta.env`
- จัดการ Loading, Error และ Empty state ทุกครั้งที่มีการดึงข้อมูลหรือกดบันทึก
- ตรวจสอบ `package.json` ก่อนเสมอ ห้ามลงแพ็กเกจใหม่เพิ่มโดยไม่ถามก่อน
- แก้โค้ดเฉพาะจุดที่สั่ง ห้ามจัดรูปแบบ (reformat) หรือแก้บรรทัดอื่นที่ไม่เกี่ยวข้อง