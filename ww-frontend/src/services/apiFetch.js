// src/services/apiFetch.js
// ─────────────────────────────────────────────────────────────
// API Wrapper สำหรับทุก fetch ในโปรเจกต์ PPOS
// - โหลด BASE_URL จาก .env (VITE_API_URL)
// - แนบ JWT Token อัตโนมัติ
// - จัดการ 401/403 → logout + redirect ไป /login
// - Parse JSON ให้เลย (ไม่ต้อง .json() เอง)
// ─────────────────────────────────────────────────────────────

// ตัด "/" ตัวสุดท้ายออก (กัน http://localhost:5000/api/ → http://localhost:5000/api)
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default async function apiFetch(path, options = {}) {
  // ถ้า path ไม่ขึ้นต้นด้วย "/" ให้เติมให้ (กันพิมพ์ผิด)
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const token = localStorage.getItem('token');

  const res = await fetch(`${BASE_URL}${cleanPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  // Token หมดอายุ / ไม่มีสิทธิ์ → เคลียร์ session แล้วกลับ login
  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return;
  }

  return res.json();
}