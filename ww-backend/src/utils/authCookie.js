// src/utils/authCookie.js
// ตั้งค่า / ล้าง httpOnly cookie ที่เก็บ JWT (JavaScript ฝั่งเบราว์เซอร์อ่านไม่ได้)
const COOKIE_NAME = 'access_token';

const isProd = process.env.NODE_ENV === 'dev';

// อายุ cookie ต้องสัมพันธ์กับอายุ JWT (ค่าเริ่มต้น 8 ชั่วโมง = 1 กะทำงาน)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const COOKIE_MAX_AGE_MS = Number(process.env.COOKIE_MAX_AGE_MS) || 8 * 60 * 60 * 1000;

const baseOptions = () => ({
    httpOnly: true,                                   // กัน XSS อ่าน token
    secure: isProd && process.env.COOKIE_SECURE !== 'false', // ส่งผ่าน HTTPS เท่านั้นใน production
    sameSite: process.env.COOKIE_SAMESITE || 'strict', // กัน CSRF (ถ้า FE/BE คนละโดเมนค่อยเปลี่ยนเป็น 'none')
    path: '/api',                                     // ส่ง cookie เฉพาะตอนเรียก API
    domain: process.env.COOKIE_DOMAIN || undefined,
});

const setAuthCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, { ...baseOptions(), maxAge: COOKIE_MAX_AGE_MS });
};

const clearAuthCookie = (res) => {
    // clearCookie ต้องใช้ options เดียวกับตอน set (ยกเว้น maxAge)
    res.clearCookie(COOKIE_NAME, baseOptions());
};

module.exports = { COOKIE_NAME, JWT_EXPIRES_IN, setAuthCookie, clearAuthCookie };
