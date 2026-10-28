// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    // ตอน dev ให้ Vite proxy /api ไปที่ backend → เบราว์เซอร์เห็นเป็น origin เดียวกัน
    // (cookie SameSite=Strict ใช้ได้ ไม่ต้องเปิด CORS) ตรงกับ production ที่ใช้ /api ผ่าน Nginx
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_TARGET || 'http://localhost:3000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: false, // ไม่เปิดเผย source code ใน production
  },
})
