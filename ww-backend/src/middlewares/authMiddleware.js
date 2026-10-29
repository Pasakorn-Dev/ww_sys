// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();
const { COOKIE_NAME } = require('../utils/authCookie');

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    // 1) ตรวจ token — พลาดตรงนี้เท่านั้นถึงจะตอบ 401 (ให้ frontend เด้งไปหน้า login)
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }

    // 2) ดึง group_id / branch_id สดจาก DB — ถ้า DB ล่ม ต้องไม่ตอบ 401
    //    (เดิม catch รวมกัน → DB เชื่อมไม่ได้ก็กลายเป็น 401 แล้ว frontend เด้งกลับหน้า login ทั้งที่ login ถูกต้อง)
    try {
        const userRes = await db.query(
            'SELECT group_id, branch_id FROM public.users WHERE id = $1',
            [decoded.id]
        );
        const userData = userRes.rows[0];
        if (!userData) {
            return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่' });
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            group_id: userData.group_id,
            branch_id: userData.branch_id,
        };
        next();
    } catch (error) {
        console.error('[Auth] DB error ระหว่างตรวจสิทธิ์:', error.message);
        return res.status(503).json({ success: false, message: 'ระบบฐานข้อมูลไม่พร้อมใช้งาน' });
    }
};

module.exports = verifyToken;
