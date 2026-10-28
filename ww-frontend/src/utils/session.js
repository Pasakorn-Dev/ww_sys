// src/utils/session.js
// เก็บเฉพาะ "ข้อมูลโปรไฟล์สำหรับแสดงผล" ใน sessionStorage (หายเมื่อปิดแท็บ)
//  - ไม่เก็บ token (token อยู่ใน httpOnly cookie ที่ JS อ่านไม่ได้)
//  - ข้อมูลนี้แก้ได้ฝั่ง client จึงใช้แสดง UI เท่านั้น — สิทธิ์จริงตรวจที่ backend ทุก request
const USER_KEY = 'user';

export function getUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  try { sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

// ล้างข้อมูล session ฝั่ง client แต่เก็บค่าธีม (theme) ไว้
export function clearSession() {
  try { sessionStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  // เผื่อเหลือค่าเก่าจากเวอร์ชันก่อนหน้าที่เคยเก็บ token ไว้
  try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* ignore */ }
}
