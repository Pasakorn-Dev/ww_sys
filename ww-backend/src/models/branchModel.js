const db = require('../config/db');

const BranchModel = {
    // ดึงข้อมูลสาขาทั้งหมด
    getAllBranches: async () => {
        const query = 'SELECT * FROM public.branches ORDER BY id ASC';
        const result = await db.query(query);
        return result.rows;
    },
    
    // เพิ่มสาขาใหม่
    createBranch: async (branchData) => {
        const { branch_code, branch_name, address, contact_number } = branchData;
        const query = `
            INSERT INTO public.branches (branch_code, branch_name, address, contact_number)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const values = [branch_code, branch_name, address, contact_number];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    updateBranch: async (id, branchData) => {
        const { branch_code, branch_name, address, contact_number, is_active } = branchData;
        const query = `
            UPDATE public.branches 
            SET branch_code = $1, branch_name = $2, address = $3, contact_number = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING *;
        `;
        const result = await db.query(query, [branch_code, branch_name, address, contact_number, is_active, id]);
        return result.rows[0];
    },

    deleteBranch: async (id) => {
        const query = 'DELETE FROM public.branches WHERE id = $1 RETURNING id;';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    // ฟังก์ชันใหม่: ดึงสาขาตามระดับสิทธิ์ (Access Level)
    getAllowedBranches: async (userId, primaryBranchId, accessLevel) => {
        let query = '';
        let params = [];

        if (accessLevel === 1) {
            // Level 1 (Admin): เห็นครบทุกสาขา
            query = 'SELECT * FROM public.branches WHERE is_active = true ORDER BY id ASC';
        } else if (accessLevel === 2) {
            // Level 2: สาขาตั้งต้น (Primary) + สาขาที่ Map สิทธิ์ไว้ใน user_branches
            query = `
                SELECT DISTINCT b.* 
                FROM public.branches b
                LEFT JOIN public.user_branches ub ON b.id = ub.branch_id AND ub.user_id = $1
                WHERE b.is_active = true 
                  AND (b.id = $2 OR ub.branch_id IS NOT NULL)
                ORDER BY b.id ASC
            `;
            params = [userId, primaryBranchId];
        } else {
            // Level 3: เฉพาะสาขาตั้งต้น (Primary Branch) เท่านั้น
            query = 'SELECT * FROM public.branches WHERE id = $1 AND is_active = true';
            params = [primaryBranchId];
        }

        const result = await db.query(query, params);
        return result.rows;
    }
};

module.exports = BranchModel;