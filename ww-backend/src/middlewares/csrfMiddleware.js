// src/middlewares/csrfMiddleware.js
// ป้องกัน CSRF เพิ่มอีกชั้นนอกจาก SameSite cookie สำหรับ request ที่แก้ไขข้อมูล (POST/PUT/PATCH/DELETE)
//  1) ถ้ามี Origin header ต้องตรงกับโดเมนที่อนุญาต
//  2) ต้องมี header X-Requested-With (ฟอร์มข้ามเว็บส่ง header นี้ไม่ได้โดยไม่ผ่าน CORS preflight)
const { getAllowedOrigins } = require('../utils/origins');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = (req, res, next) => {
    if (SAFE.has(req.method)) return next();

    const origin = req.headers.origin;
    if (origin) {
        const sameHost = origin.replace(/^https?:\/\//, '') === req.headers.host;
        if (!sameHost && !getAllowedOrigins().includes(origin.replace(/\/$/, ''))) {
            console.warn(`[CSRF] origin ถูกปฏิเสธ: ${origin} (host=${req.headers.host}) → เพิ่มใน CORS_ORIGINS ถ้าเป็นโดเมนที่ถูกต้อง`);
            return res.status(403).json({ success: false, message: 'Origin ไม่ได้รับอนุญาต' });
        }
    }

    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ success: false, message: 'คำขอไม่ถูกต้อง (CSRF)' });
    }
    next();
};
