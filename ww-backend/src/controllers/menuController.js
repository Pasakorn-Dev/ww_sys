const MenuModel = require('../models/menuModel');
const db = require('../config/db');

const menuController = {
    getUserMenus: async (req, res) => {
        try {
            // req.user.id ได้มาจาก Token ที่ถูกถอดรหัสใน Middleware
            const userId = req.user.id;
            
            // ค้นหา group_id ของ User นี้
            const userResult = await db.query('SELECT group_id FROM public.users WHERE id = $1', [userId]);
            const groupId = userResult.rows[0]?.group_id;

            if (!groupId) {
                // ถ้าไม่มีกลุ่มเลย ให้ส่ง Array ว่างกลับไป (ไม่เห็นเมนูอะไรเลย)
                return res.json({ success: true, data: [] }); 
            }

            // ถ้ามีกลุ่ม ให้ไปดึงเมนูตามสิทธิ์
            const menus = await MenuModel.getMenusByGroupId(groupId);
            res.json({ success: true, data: menus });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};

module.exports = menuController;