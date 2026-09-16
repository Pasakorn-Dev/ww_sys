const db = require('../config/db');

const UserModel = {
    // หาผู้ใช้งานจาก Username (ใช้ตอน Login)
    findByUsername: async (username) => {
        const query = `
            SELECT u.*, b.branch_name
            FROM public.users u
            LEFT JOIN public.branches b ON u.branch_id = b.id
            WHERE u.username = $1
        `;
        const result = await db.query(query, [username]);
        return result.rows[0];
    },
    
    // สร้างผู้ใช้งานใหม่ (ใช้ตอน Register / เพิ่มพนักงาน)
    createUser: async (userData) => {
        const { username, password, fullname, group_id, branch_id, dept_id } = userData;
        const query = `
            INSERT INTO public.users (username, password, fullname, group_id, branch_id, dept_id)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, fullname;
        `;
        const values = [username, password, fullname, group_id, branch_id, dept_id];
        const result = await db.query(query, values);
        return result.rows[0];
    }
};

module.exports = UserModel;