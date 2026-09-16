const db = require('../config/db');

const MenuModel = {
    // ดึงเมนูที่ User คนนั้นมีสิทธิ์ "มองเห็น" (can_view = true)
    getMenusByGroupId: async (groupId) => {
        const query = `
            SELECT m.id, m.menu_name, m.link, m.icon, m.parent_id, 
                   gp.can_view, gp.can_add, gp.can_edit, gp.can_delete
            FROM public.menus m
            INNER JOIN public.group_permissions gp ON m.id = gp.menu_id
            WHERE gp.group_id = $1 AND gp.can_view = true
            ORDER BY m.parent_id ASC, m.sort_order ASC;
        `;
        const result = await db.query(query, [groupId]);
        return result.rows;
    }
};

module.exports = MenuModel;