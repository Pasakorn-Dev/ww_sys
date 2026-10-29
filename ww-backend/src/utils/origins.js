// src/utils/origins.js
// แหล่งเดียวของรายชื่อ Origin ที่อนุญาต — ใช้ร่วมกันทั้ง CORS (server.js) และ CSRF (csrfMiddleware.js)
// (เดิมสองที่อ่านคนละแบบ ทำให้ dev ที่ยิงจาก http://localhost:5173 โดนปฏิเสธ 403 ฝั่ง CSRF)
const parse = (v) =>
    (v || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

const DEV_ORIGINS = [
    'http://localhost:5173', 'http://127.0.0.1:5173',   // vite dev
    'http://localhost:4173', 'http://127.0.0.1:4173',   // vite preview
];

const getAllowedOrigins = () => {
    const list = parse(process.env.CORS_ORIGINS);
    if (process.env.NODE_ENV !== 'production') list.push(...DEV_ORIGINS);
    return list;
};

module.exports = { getAllowedOrigins };
