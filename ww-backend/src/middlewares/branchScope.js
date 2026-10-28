// src/middlewares/branchScope.js
// บังคับ "สิทธิ์ตามสาขา" ที่ฝั่ง Server
//   access_level 1 = ทุกสาขา | 2 = สาขาตั้งต้น + สาขาใน user_branches | 3 = สาขาตั้งต้นเท่านั้น
// ห้ามเชื่อ branch_id ที่ client ส่งมาตรง ๆ — ต้องเช็คว่าอยู่ในสาขาที่ user มีสิทธิ์
const db = require('../config/db');
const BranchModel = require('../models/branchModel');

const toPositiveInt = (v) => {
    if (v === undefined || v === null || v === '') return null;
    if (!/^\d+$/.test(String(v))) return NaN;
    return Number(v);
};

// ระดับสิทธิ์สูงสุดที่ group นี้มี (ใช้กับ route ที่ไม่ผูกกับเมนูใดเมนูหนึ่ง เช่น dashboard)
const getEffectiveAccessLevel = async (groupId) => {
    const { rows } = await db.query(
        `SELECT MIN(access_level) AS lvl FROM public.group_permissions WHERE group_id = $1 AND can_view = true`,
        [groupId]
    );
    return Number(rows[0]?.lvl || 3);
};

/**
 * @param {object}  opts
 * @param {boolean} opts.required          ต้องส่ง branch_id มาเสมอ (default true)
 * @param {boolean} opts.allowAll          อนุญาต branch_id=0 (ทุกสาขา) เฉพาะ level 1 (ใช้กับ sync)
 * @param {boolean} opts.defaultToPrimary  ถ้าไม่ส่งมา → ใช้สาขาตั้งต้น (level 1 = ไม่กรอง)
 * @param {boolean} opts.useMenuLevel      ใช้ access_level ของเมนูจาก checkPermission (default true)
 */
const branchScope = (opts = {}) => {
    const { required = true, allowAll = false, defaultToPrimary = false, useMenuLevel = true } = opts;

    return async (req, res, next) => {
        try {
            let userRow = null;
            if (req.user.group_id === undefined || req.user.branch_id === undefined) {
                const r = await db.query('SELECT group_id, branch_id FROM public.users WHERE id = $1', [req.user.id]);
                userRow = r.rows[0];
                if (!userRow) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
                req.user.group_id = userRow.group_id;
                req.user.branch_id = userRow.branch_id;
            }

            // access_level: จากเมนู (checkPermission) → ไม่งั้นใช้ระดับสูงสุดของ group
            let level = useMenuLevel && req.user.access_level ? Number(req.user.access_level) : null;
            if (!level) level = await getEffectiveAccessLevel(req.user.group_id);

            const raw = req.body?.branch_id ?? req.query?.branch_id;
            const requested = toPositiveInt(raw);

            if (Number.isNaN(requested)) {
                return res.status(400).json({ success: false, message: 'branch_id ไม่ถูกต้อง' });
            }

            // รายการสาขาที่มีสิทธิ์
            const allowed = await BranchModel.getAllowedBranches(req.user.id, req.user.branch_id, level);
            const allowedIds = allowed.map((b) => Number(b.id));

            let branchId = requested;

            if (requested === 0) {
                if (!(allowAll && level === 1)) {
                    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการกับทุกสาขา' });
                }
            } else if (requested === null) {
                if (defaultToPrimary) {
                    branchId = level === 1 ? undefined : Number(req.user.branch_id);
                } else if (required) {
                    return res.status(400).json({ success: false, message: 'กรุณาระบุสาขา' });
                }
            } else if (!allowedIds.includes(requested)) {
                return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของสาขานี้' });
            }

            req.scope = { accessLevel: level, branchId, allowedBranchIds: allowedIds };
            next();
        } catch (err) {
            console.error('branchScope error:', err);
            res.status(500).json({ success: false, message: 'Server Error (Branch Scope)' });
        }
    };
};

module.exports = { branchScope, getEffectiveAccessLevel };
