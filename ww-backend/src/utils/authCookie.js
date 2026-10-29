// src/utils/authCookie.js
// ตั้งค่า / ล้าง httpOnly cookie ที่เก็บ JWT (JavaScript ฝั่งเบราว์เซอร์อ่านไม่ได้)
const COOKIE_NAME = 'access_token';

// อายุ cookie ต้องสัมพันธ์กับอายุ JWT (ค่าเริ่มต้น 8 ชั่วโมง = 1 กะทำงาน)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const COOKIE_MAX_AGE_MS = Number(process.env.COOKIE_MAX_AGE_MS) || 8 * 60 * 60 * 1000;

// อ่านค่า env ตอนเรียกใช้ (ไม่ใช่ตอน require) กันปัญหา dotenv โหลดทีหลัง
const resolveSecure = () => {
    // บังคับด้วย COOKIE_SECURE=true|false ได้เสมอ (เช่น ทดสอบ prod ผ่าน http ในวง LAN ให้ตั้ง false)
    if (process.env.COOKIE_SECURE === 'true') return true;
    if (process.env.COOKIE_SECURE === 'false') return false;
    // ค่าเริ่มต้น: production = Secure (ต้อง https), นอกนั้น = ไม่ Secure (http://localhost ใช้ได้)
    return process.env.NODE_ENV === 'production';   // ✅ แก้จากเดิมที่เป็น === 'dev' (กลับด้าน)
};

const baseOptions = () => ({
    httpOnly: true,                                    // กัน XSS อ่าน token
    secure: resolveSecure(),
    sameSite: process.env.COOKIE_SAMESITE || 'strict', // FE/BE โดเมนเดียวกันผ่าน /api → strict ได้
    path: '/api',                                      // ส่ง cookie เฉพาะตอนเรียก API
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
