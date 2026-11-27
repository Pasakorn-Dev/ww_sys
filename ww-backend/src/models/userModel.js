const db = require('../config/db');

const UserModel = {
    // หาผู้ใช้งานจาก Username (ใช้ตอน Login)
    findByUsername: async (username) => {
        const query = `
            SELECT u.*, b.branch_name
            FROM public.users u
            LEFT JOIN public.branches b ON u.branch_id = b.id
            WHERE u.username = $1 and u.force_logout = 0
        `;
        const result = await db.query(query, [username]);
        return result.rows[0];
    },
    
    // หาผู้ใช้จาก id (ใช้กับ /auth/me) — ไม่ดึง password ออกมา
    findById: async (id) => {
        const query = `
            SELECT u.id, u.username, u.fullname, u.branch_id, u.group_id, u.avatar, b.branch_name
            FROM public.users u
            LEFT JOIN public.branches b ON u.branch_id = b.id
            WHERE u.id = $1
        `;
        // console.log(id);
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    // หาข้อมูลผู้ใช้พร้อม password hash (ใช้ตรวจสอบรหัสผ่านเดิมตอนเปลี่ยนรหัสผ่าน)
    findAuthById: async (id) => {
        const query = `
            SELECT id, username, password, branch_id
            FROM public.users
            WHERE id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    // อัปเดตรหัสผ่านของผู้ใช้
    updatePassword: async (id, hashedPassword) => {
        const query = `
            UPDATE public.users
            SET password = $1
            WHERE id = $2
            RETURNING id, username
        `;
        const result = await db.query(query, [hashedPassword, id]);
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
    },
    
    // สร้างผู้ใช้งานใหม่ พร้อมผูกสิทธิ์หลายสาขา (Transaction)
    createUserAdmin: async (userData) => {
        const { username, password, fullname, group_id, branch_id, dept_id, allowed_branches, avatar } = userData;
        const client = await db.connect(); // ใช้ client สำหรับทำ Transaction

        try {
            await client.query('BEGIN');

            // 1. บันทึกข้อมูลผู้ใช้ลงตารางหลัก (ใช้ Parameterized Query ป้องกัน SQL Injection)
            const insertUserQuery = `
                INSERT INTO public.users (username, password, fullname, group_id, branch_id, dept_id, avatar)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, fullname, avatar;
            `;
            const userValues = [username, password, fullname, group_id, branch_id, dept_id, avatar || null];
            const userResult = await client.query(insertUserQuery, userValues);
            const newUserId = userResult.rows[0].id;

            // 2. บันทึกสิทธิ์การเข้าถึงสาขารอง ลงตาราง user_branches (ถ้ามีการส่งมา)
            if (allowed_branches && Array.isArray(allowed_branches) && allowed_branches.length > 0) {
                // กรองไม่ให้ใส่สาขาหลักซ้ำซ้อนในสาขารอง
                const extraBranches = allowed_branches.filter(b_id => b_id !== branch_id);
                
                if (extraBranches.length > 0) {
                    let branchQueryValues = [];
                    let placeholders = [];
                    let paramIndex = 1;

                    extraBranches.forEach(bId => {
                        branchQueryValues.push(newUserId, bId);
                        placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
                    });

                    const insertBranchesQuery = `
                        INSERT INTO public.user_branches (user_id, branch_id)
                        VALUES ${placeholders.join(', ')}
                    `;
                    await client.query(insertBranchesQuery, branchQueryValues);
                }
            }

            await client.query('COMMIT');
            return userResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // อัปเดตข้อมูลผู้ใช้งานและสิทธิ์สาขา (Transaction)
    updateUserAdmin: async (userId, userData) => {
        const { username, password, fullname, group_id, branch_id, dept_id, allowed_branches, avatar, remove_avatar } = userData;
        const client = await db.connect(); 

        try {
            await client.query('BEGIN');

            // 1. อัปเดตตาราง users แบบยืดหยุ่น (เฉพาะฟิลด์ที่ส่งมา)
            const setClauses = ['username = $1', 'fullname = $2', 'group_id = $3', 'branch_id = $4', 'dept_id = $5'];
            const userValues = [username, fullname, group_id, branch_id, dept_id];

            if (password) {
                userValues.push(password);
                setClauses.push(`password = $${userValues.length}`);
            }

            if (avatar) {
                userValues.push(avatar);
                setClauses.push(`avatar = $${userValues.length}`);
            } else if (remove_avatar) {
                setClauses.push('avatar = NULL');
            }

            userValues.push(userId);
            const updateUserQuery = `
                UPDATE public.users
                SET ${setClauses.join(', ')}
                WHERE id = $${userValues.length}
                RETURNING id, username, fullname, avatar;
            `;

            const userResult = await client.query(updateUserQuery, userValues);

            // 2. จัดการตาราง user_branches (ลบสิทธิ์สาขารองเดิมออกทั้งหมดก่อน แล้วค่อย Insert ใหม่)
            await client.query('DELETE FROM public.user_branches WHERE user_id = $1', [userId]);

            if (Array.isArray(allowed_branches) && allowed_branches.length > 0) {
                // กรองไม่ให้เอาสาขาหลักไปใส่ในสาขารอง
                const extraBranches = allowed_branches.filter(b_id => Number(b_id) !== Number(branch_id));
                
                if (extraBranches.length > 0) {
                    const branchValues = [];
                    const placeholders = [];
                    let paramIndex = 1;

                    extraBranches.forEach(bId => {
                        branchValues.push(userId, bId);
                        placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
                    });

                    const insertBranchesQuery = `
                        INSERT INTO public.user_branches (user_id, branch_id)
                        VALUES ${placeholders.join(', ')}
                    `;
                    await client.query(insertBranchesQuery, branchValues);
                }
            }

            await client.query('COMMIT');
            return userResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // src/models/userModel.js
    // ... ภายใน object UserModel
    getUserById: async (id) => {
        // ดึงข้อมูลหลัก
        const userQuery = `SELECT id, username, fullname, group_id, branch_id, dept_id, avatar FROM public.users WHERE id = $1`;
        const userRes = await db.query(userQuery, [id]);
        
        if (userRes.rows.length === 0) return null;
        const user = userRes.rows[0];

        // ดึงสาขารอง
        const branchQuery = `SELECT branch_id FROM public.user_branches WHERE user_id = $1`;
        const branchRes = await db.query(branchQuery, [id]);
        
        // แนบสาขารองกลับไปเป็น Array
        user.allowed_branches = branchRes.rows.map(row => row.branch_id);
        
        return user;
    },

    getAllUsersAdmin: async () => {
      // ดึงรายชื่อผู้ใช้ทั้งหมด พร้อม Join หาชื่อกลุ่ม และ ชื่อสาขา
      const query = `
          SELECT u.id, u.username, u.fullname, u.avatar,
                 g.group_name, b.branch_name
          FROM public.users u
          LEFT JOIN public.user_groups g ON u.group_id = g.id
          LEFT JOIN public.branches b ON u.branch_id = b.id
          ORDER BY u.id DESC;
      `;
      const result = await db.query(query);
      return result.rows;
    },

    deleteUserAdmin: async (userId) => {
        // ลบข้อมูลผู้ใช้ (ตาราง user_branches ที่ผูกไว้ควรเซ็ต ON DELETE CASCADE ในฐานข้อมูลไว้แล้ว)
        const query = `DELETE FROM public.users WHERE id = $1 RETURNING id, avatar;`;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    },
};

module.exports = UserModel;
