const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { getMssqlConnection } = require('../config/mssqlDb');

const BCRYPT_ROUNDS = 12;

const MSSQL_EMPLOYEE_QUERY = `
SELECT a.code, a.name, a.title, a.title_en, a.branch_code, a.group_name,
    CASE
        WHEN a.group_name = 'Manager' AND a.branch_code = 'WU' THEN '["WU","WB"]'
        WHEN a.group_name = 'Manager' AND a.branch_code = 'WC' THEN '["WC","WQ"]'
        WHEN a.group_name = 'Manager' AND a.branch_code = 'WN' THEN '["WN","WT","WP","WO"]'
    ELSE '["' + a.branch_code + '"]' END AS site_manage
FROM (
    SELECT code, name, title,
        title_en, site AS branch_code,
        CASE
            WHEN title_en = N'ผู้จัดการโรงงาน' THEN 'Manager'
            WHEN title_en = N'รองผู้จัดการโรงงาน' THEN 'DeputyManager'
            WHEN title_en = N'พนักงานข้อมูล' OR title_en = N'หัวหน้าแผนกข้อมูล' THEN 'DataClerk'
            WHEN title_en = N'พนักงานส่งออก' OR title_en = N'หัวหน้าแผนกส่งออก' THEN 'ExportStaff'
        ELSE 'no condition' END AS group_name
    FROM WWG_Employee
    WHERE title_EN IN (
        N'ผู้จัดการโรงงาน',
        N'พนักงานข้อมูล',
        N'พนักงานส่งออก',
        N'รองผู้จัดการโรงงาน',
        N'หัวหน้าแผนกข้อมูล',
        N'หัวหน้าแผนกส่งออก'
    ) AND title_EN IS NOT NULL AND status = 'AC'
) a
`;

/**
 * แปลงข้อความ JSON array จาก site_manage เช่น '["WN","WT","WP","WO"]' เป็น array ของรหัสสาขาที่ไม่ซ้ำ
 */
const parseSiteManage = (rawSiteManage, fallbackBranchCode) => {
    const codes = new Set();

    if (typeof rawSiteManage === 'string' && rawSiteManage.trim() !== '') {
        try {
            const parsed = JSON.parse(rawSiteManage);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    const code = String(item || '').trim();
                    if (code) codes.add(code);
                }
            }
        } catch {
            // fallback ด้านล่างถ้า parse JSON ไม่สำเร็จ
        }
    }

    if (codes.size === 0 && fallbackBranchCode) {
        codes.add(String(fallbackBranchCode).trim());
    }

    return Array.from(codes);
};

/**
 * อัปเดตสิทธิ์สาขาในตาราง user_branches ให้ตรงกับ site_manage จากต้นทาง
 */
const replaceUserBranches = async (pgClient, userId, branchIds) => {
    await pgClient.query('DELETE FROM public.user_branches WHERE user_id = $1', [userId]);

    if (branchIds.length === 0) return;

    const values = [];
    const placeholders = [];
    branchIds.forEach((branchId, idx) => {
        const offset = idx * 2;
        values.push(userId, branchId);
        placeholders.push(`($${offset + 1}, $${offset + 2})`);
    });

    await pgClient.query(
        `INSERT INTO public.user_branches (user_id, branch_id)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (user_id, branch_id) DO NOTHING`,
        values
    );
};

/**
 * ฟังก์ชันหลักสำหรับซิงค์ข้อมูลพนักงานจาก SQL Server -> PostgreSQL
 */
const runEmployeeSync = async () => {
    const startTime = Date.now();

    // 1. ดึงข้อมูลพนักงานที่ยังใช้งานอยู่ (status = 'AC') จาก SQL Server
    const mssqlPool = await getMssqlConnection();
    const mssqlResult = await mssqlPool.request().query(MSSQL_EMPLOYEE_QUERY);
    const employees = mssqlResult.recordset || [];

    if (employees.length === 0) {
        throw new Error('ไม่พบข้อมูลพนักงานจาก SQL Server (0 รายการ) จึงยกเลิกการซิงค์เพื่อป้องกันการปิดสิทธิ์ผู้ใช้ทั้งหมดโดยไม่ตั้งใจ');
    }

    const pgClient = await pool.connect();

    try {
        await pgClient.query('BEGIN');

        // 2. โหลดตารางอ้างอิงจาก PostgreSQL (user_groups, branches, users)
        const [groupRes, branchRes, existingUsersRes] = await Promise.all([
            pgClient.query('SELECT id, group_name FROM public.user_groups'),
            pgClient.query('SELECT id, branch_code FROM public.branches'),
            pgClient.query('SELECT id, username, sync_lock FROM public.users'),
        ]);

        const groupMap = new Map(
            groupRes.rows.map((row) => [String(row.group_name).trim(), row.id])
        );
        const branchMap = new Map(
            branchRes.rows.map((row) => [String(row.branch_code).trim(), row.id])
        );
        const existingUserMap = new Map(
            existingUsersRes.rows.map((row) => [String(row.username).trim(), row])
        );

        let createdCount = 0;
        let updatedCount = 0;
        let skippedLockedCount = 0;
        const warnings = [];
        const activeUsernames = new Set();

        // 3. วนลูปบันทึก/อัปเดตพนักงานทีละคน
        for (const emp of employees) {
            const username = String(emp.code || '').trim();
            if (!username) continue;

            activeUsernames.add(username);

            const fullname = String(emp.name || '').trim() || username;
            const groupName = String(emp.group_name || '').trim();
            const branchCode = String(emp.branch_code || '').trim();

            const groupId = groupMap.get(groupName) ?? null;
            if (groupId === null) {
                warnings.push(`ไม่พบ group_name "${groupName}" ใน user_groups (พนักงาน: ${username})`);
            }

            const branchId = branchMap.get(branchCode) ?? null;
            if (branchCode && branchId === null) {
                warnings.push(`ไม่พบ branch_code "${branchCode}" ใน branches (พนักงาน: ${username})`);
            }

            // แปลง site_manage เป็นรายการ branch_id ที่มีอยู่ใน PostgreSQL
            const manageBranchCodes = parseSiteManage(emp.site_manage, branchCode);
            const manageBranchIds = [];
            for (const code of manageBranchCodes) {
                const bId = branchMap.get(code);
                if (bId !== undefined) {
                    manageBranchIds.push(bId);
                } else {
                    warnings.push(`ไม่พบ site_manage branch_code "${code}" ใน branches (พนักงาน: ${username})`);
                }
            }

            const existing = existingUserMap.get(username);

            if (existing) {
                if (Number(existing.sync_lock) === 1) {
                    skippedLockedCount++;
                    continue;
                }

                // อัปเดตข้อมูลหลักและเปิดใช้งาน (force_logout = 0) โดยไม่ทับรหัสผ่านเดิม
                await pgClient.query(
                    `UPDATE public.users
                     SET fullname = $1,
                         group_id = $2,
                         branch_id = $3,
                         force_logout = 0
                     WHERE id = $4`,
                    [fullname, groupId, branchId, existing.id]
                );

                await replaceUserBranches(pgClient, existing.id, manageBranchIds);
                updatedCount++;
            } else {
                // ผู้ใช้ใหม่: ใช้รหัสพนักงาน (code) เข้ารหัส bcrypt เป็นรหัสผ่านเริ่มต้น
                const hashedPassword = await bcrypt.hash(username, BCRYPT_ROUNDS);

                const insertRes = await pgClient.query(
                    `INSERT INTO public.users (username, password, fullname, group_id, branch_id, force_logout, sync_lock)
                     VALUES ($1, $2, $3, $4, $5, 0, 0)
                     RETURNING id`,
                    [username, hashedPassword, fullname, groupId, branchId]
                );

                const newUserId = insertRes.rows[0].id;
                await replaceUserBranches(pgClient, newUserId, manageBranchIds);
                createdCount++;
            }
        }

        // 4. ปิดการใช้งาน (force_logout = 1) สำหรับผู้ใช้ที่ sync_lock = 0 แต่ไม่พบในต้นทาง SQL Server แล้ว
        const activeUsernameList = Array.from(activeUsernames);
        let deactivatedCount = 0;

        if (activeUsernameList.length > 0) {
            const deactivateRes = await pgClient.query(
                `UPDATE public.users
                 SET force_logout = 1
                 WHERE sync_lock = 0
                   AND force_logout = 0
                   AND NOT (username = ANY($1::text[]))`,
                [activeUsernameList]
            );
            deactivatedCount = deactivateRes.rowCount || 0;
        }

        await pgClient.query('COMMIT');

        const syncTime = ((Date.now() - startTime) / 1000).toFixed(2);
        return {
            total_source: employees.length,
            created: createdCount,
            updated: updatedCount,
            deactivated: deactivatedCount,
            skipped_locked: skippedLockedCount,
            warnings,
            sync_time: syncTime,
        };
    } catch (error) {
        await pgClient.query('ROLLBACK');
        throw error;
    } finally {
        pgClient.release();
    }
};

const employeeSyncController = {
    runEmployeeSync,

    syncEmployees: async (req, res) => {
        try {
            const summary = await runEmployeeSync();
            console.log(
                `[EmployeeSync] สำเร็จ: ต้นทาง ${summary.total_source}, เพิ่ม ${summary.created}, อัปเดต ${summary.updated}, ปิดใช้งาน ${summary.deactivated}, ล็อกข้าม ${summary.skipped_locked} (${summary.sync_time}s)`
            );

            res.json({
                success: true,
                message: 'ซิงค์ข้อมูลพนักงานสำเร็จ',
                ...summary,
            });
        } catch (error) {
            console.error('[EmployeeSync] เกิดข้อผิดพลาด:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลพนักงาน',
            });
        }
    },
};

module.exports = employeeSyncController;
