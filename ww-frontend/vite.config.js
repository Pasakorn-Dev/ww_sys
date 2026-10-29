// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ใช้ 127.0.0.1 แทน localhost: Windows + Node 17+ มักแปลง localhost เป็น ::1 (IPv6) แล้วต่อ backend ไม่ติด
// ปรับได้ด้วย VITE_DEV_API_TARGET (เช่นเมื่อ backend ใช้ PORT อื่น)
const target = process.env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3000'
// changeOrigin:false → ส่ง Host เดิม (localhost:5173) ไปให้ backend ให้ตรงกับ Origin ที่เบราว์เซอร์ส่ง (ผ่านการตรวจ CSRF)
const proxy = { '/api': { target, changeOrigin: false } }

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: { proxy },
  preview: { proxy },     // `pnpm preview` ทดสอบ build จริงในเครื่องได้ผ่าน proxy เดียวกัน
  build: { sourcemap: false },
})
