// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // 💡 เพิ่มการนำเข้า db
require('dotenv').config();
const { COOKIE_NAME } = require('../utils/authCookie');

const verifyToken = async (req, res, next) => { // 💡 เติม async เข้าไป
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        
        // 💡 เพิ่มตรงนี้: ไปดึง group_id และ branch_id สดๆ จาก DB มาแนบไว้ให้
        const userRes = await db.query(`
            SELECT group_id, branch_id FROM public.users WHERE id = $1
        `, [decoded.id]);
        const userData = userRes.rows[0] || {};
        
        req.user = { 
            id: decoded.id, 
            username: decoded.username,
            group_id: userData.group_id, // 💡 แอบเติมค่าให้แล้ว
            branch_id: userData.branch_id // 💡 แอบเติมค่าให้แล้ว
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
};

module.exports = verifyToken;