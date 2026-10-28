// src/services/apiFetch.js
// ศูนย์กลางการเรียก API
//  - ยืนยันตัวตนด้วย httpOnly cookie (credentials: 'include') — JavaScript ไม่เห็นและไม่เก็บ token
//  - แนบ X-Requested-With เพื่อให้ผ่านการป้องกัน CSRF ของ backend
import { clearSession } from '../utils/session';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// path ที่ 401 หมายถึง "รหัสผ่านผิด" ไม่ใช่ "session หมดอายุ"
const AUTH_FAIL_PATHS = ['/auth/login'];

export default async function apiFetch(path, options = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${API_URL}${cleanPath}`, {
    ...options,
    credentials: 'include',
    headers: {
      // FormData ต้องให้ browser ตั้ง Content-Type (boundary) เอง
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({ success: false, message: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง' }));

  // 401 = session หมดอายุ/ไม่ถูกต้อง → ล้างข้อมูลฝั่ง client แล้วกลับหน้า login
  if (res.status === 401 && !AUTH_FAIL_PATHS.includes(cleanPath)) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return;
  }

  // 403 = ไม่มีสิทธิ์ (ไม่เตะออก ให้หน้าแจ้งเตือนเอง)
  if (res.status === 403) {
    console.warn('Permission Denied:', data?.message);
  }

  return data;
}
