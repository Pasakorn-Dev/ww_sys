---
trigger: glob
globs:
  - "ww-backend/**"
description: "มาตรฐานโค้ดสำหรับฝั่ง Backend (Node.js + Express + PostgreSQL)"
---

# Backend Rules (`ww-backend`)
- ใช้ Node.js + Express และยึดโครงสร้างโฟลเดอร์ (routes / controllers / services) ตามของเดิมในโปรเจกต์
- การคิวรี PostgreSQL ต้องใช้ Parameterized Query (`$1, $2`) เสมอ ห้ามต่อ String ลงใน SQL ตรงๆ
- ตรวจสอบ Input Validation ก่อนประมวลผล และตอบกลับ JSON ในโครงสร้างเดียวกันทั้งระบบ (เช่น `{ success, data, message }`)
- การคำนวณตัวเลข ราคา ค่าแรง หรือยอดสรุปรายงาน ต้องดักค่า `null`, `undefined` และ `0` เสมอ ป้องกันค่า `NaN` หรือหารด้วยศูนย์
- งานส่งออกไฟล์รายงาน (เช่น Puppeteer สำหรับ PDF หรือ ExcelJS สำหรับ Excel) ต้องปิด browser/page หรือคืน memory ใน `finally` ทุกครั้ง
- ใช้ `try/catch` ดัก Error และไม่ส่งรายละเอียดระบบภายในหรือรหัสผ่านกลับไปฝั่ง Frontend