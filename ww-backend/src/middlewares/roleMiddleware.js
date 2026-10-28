// src/middlewares/roleMiddleware.js
const db = require('../config/db');

// อนุญาตเฉพาะ Admin (group_id = 1) — อ่านจาก DB ทุกครั้ง ไม่เชื่อค่าใน token
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID) || 1;

const requireAdmin = async (req, res, next) => {
    try {
        const { rows } = await db.query('SELECT group_id FROM public.users WHERE id = $1', [req.user.id]);
        if (!rows[0] || Number(rows[0].group_id) !== ADMIN_GROUP_ID) {
            return res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { requireAdmin, ADMIN_GROUP_ID };
