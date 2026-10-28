// src/utils/validateEnv.js
// ตรวจสอบค่า .env สำคัญตอน start server — ถ้าไม่ปลอดภัยใน production ให้หยุดทันที
const WEAK_PATTERNS = [/your_super/i, /secret_key_here/i, /changeme/i, /^ww_your/i];

module.exports = function validateEnv() {
    const isProd = process.env.NODE_ENV === 'production';
    const problems = [];

    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32) problems.push('JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร (แนะนำ 64+ แบบสุ่ม)');
    if (WEAK_PATTERNS.some((re) => re.test(secret))) problems.push('JWT_SECRET ยังเป็นค่าตัวอย่าง ต้องสร้างค่าสุ่มใหม่');

    if (isProd && !process.env.CORS_ORIGINS) problems.push('ต้องตั้ง CORS_ORIGINS ใน production');
    if (!process.env.DB_PASSWORD) problems.push('ไม่ได้ตั้ง DB_PASSWORD');

    if (problems.length) {
        const msg = '[Config] พบปัญหาการตั้งค่า:\n - ' + problems.join('\n - ');
        if (isProd) {
            console.error(msg);
            process.exit(1);
        } else {
            console.warn(msg + '\n(โหมดไม่ใช่ production จึงยังรันต่อได้)');
        }
    }
};
