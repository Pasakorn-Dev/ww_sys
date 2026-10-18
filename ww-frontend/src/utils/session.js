// src/utils/session.js
// ล้างข้อมูล session ทั้งหมด แต่เก็บค่าธีม (theme) ไว้
export function clearSession() {
  let theme = null;
  try { theme = localStorage.getItem('theme'); } catch { /* ignore */ }
  try { localStorage.clear(); } catch { /* ignore */ }
  try { if (theme) localStorage.setItem('theme', theme); } catch { /* ignore */ }
}