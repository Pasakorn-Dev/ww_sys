// src/middlewares/permissionMiddleware.js
const db = require('../config/db');

const checkPermission = (menuLink, action) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id; // ได้มาจาก verifyToken

            // 1. ดึงข้อมูล User (group_id, branch_id)
            const userRes = await db.query(`
                SELECT group_id, branch_id FROM public.users WHERE id = $1
            `, [userId]);
            const userData = userRes.rows[0];
            const groupId = userData?.group_id;
            const branchId = userData?.branch_id;

            if (!groupId) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (No Group)' });

            // 2. เช็คสิทธิ์จากตาราง group_permissions โดยอ้างอิงจาก link ของเมนู (ดึง access_level ตามเมนู)
            const permRes = await db.query(`
                SELECT gp.can_view, gp.can_add, gp.can_edit, gp.can_delete, gp.access_level
                FROM public.group_permissions gp
                JOIN public.menus m ON gp.menu_id = m.id
                WHERE gp.group_id = $1 AND m.link = $2
            `, [groupId, menuLink]);

            const perm = permRes.rows[0];
            if (!perm) return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงเมนูนี้' });

            // 3. ตรวจสอบตาม action ที่ส่งมา
            let hasAccess = false;
            if (action === 'view') hasAccess = perm.can_view;
            if (action === 'add') hasAccess = perm.can_add;
            if (action === 'edit') hasAccess = perm.can_edit;
            if (action === 'delete') hasAccess = perm.can_delete;

            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ทำรายการนี้' });
            }
            
            // 4. แนบข้อมูลสิทธิ์เพิ่มเติมไว้ใน req เพื่อให้ controller ใช้ได้
            // access_level ดึงจาก group_permissions ตามเมนู
            const accessLevel = Number(perm.access_level || 3);
            req.user.access_level = accessLevel;
            req.user.group_id = groupId;
            req.user.branch_id = branchId;
            req.permission = perm;
            
            // Debug log
            // console.log(`=== Permission Check [${menuLink}] ===`);
            // console.log('Action:', action);
            // console.log('Access Level from group_permissions:', accessLevel);
            // console.log('Branch ID:', branchId);
            
            next(); // มีสิทธิ์ -> ให้ผ่านไปทำ API ถัดไปได้
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error (Check Permissions)' });
        }
    };
};

module.exports = checkPermission;