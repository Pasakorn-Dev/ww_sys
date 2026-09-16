// src/config/api.js

// 1. อ่านค่า Base URL จาก .env (ถ้าไม่มีจะ Fallback ไปที่ localhost:5000/api)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * 2. ฟังก์ชันตัวช่วยยิง API (Fetch Wrapper)
 * ช่วยต่อ URL อัตโนมัติ และใส่ Header Authorization: Bearer <token> ให้อัตโนมัติ
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  // รวม Headers เริ่มต้นเข้ากับ Headers ที่ส่งเข้ามา
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // ตัด slash ข้างหน้าออกเพื่อความถูกต้อง (เช่น /menus หรือ menus ก็ทำงานได้)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  return response;
};