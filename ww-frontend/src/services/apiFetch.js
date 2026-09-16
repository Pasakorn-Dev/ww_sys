// src/services/apiFetch.js

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default async function apiFetch(path, options = {}) {
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

  // 1. ถ้า Token พัง หรือ หมดอายุ (401) ค่อยเตะออก
  if (res.status === 401) {
    localStorage.clear();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return;
  }

  // 2. ถ้าแค่ "ไม่มีสิทธิ์" (403) ไม่ต้องเตะออก ให้ดึง json ออกมาเพื่อแจ้งเตือนเฉยๆ
  const data = await res.json();
  
  if (res.status === 403) {
      console.warn("Permission Denied:", data.message);
      // ตัว API จะถูกส่งข้อมูลกลับไปให้ Component (เช่น หน้า SyncMaster)
      // แจ้งเตือน Swal สีแดงๆ แทนการหลุดไปหน้า Login
      return data; 
  }

  return data;
}