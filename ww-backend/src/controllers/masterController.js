const pool = require('../config/db');
const format = require('pg-format');
const { getMysqlConnection } = require('../config/mysqlDb'); 

// ⚠️ ถ้าระบบแจ้งเตือน LINE แจ้ง Error ให้เปิดใช้งานบรรทัดล่างนี้ (เอา // ออก) แล้วสร้างไฟล์แจ้งเตือน
// const { sendLineNotify } = require('../services/notifyService'); 

// ================================================================
// 🛠️ 1. ฟังก์ชันตัวช่วย
// ================================================================
const cleanInt = (val, defaultVal = 0) => {
    if (val === null || val === undefined || val === '\\N' || val === '') return defaultVal;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultVal : parsed;
};

const cleanFloat = (val, defaultVal = 0.0000) => {
    if (val === null || val === undefined || val === '\\N' || val === '') return defaultVal;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
};

const cleanBool = (val, defaultVal = false) => {
    if (val === null || val === undefined) return defaultVal;
    if (Buffer.isBuffer(val)) return val[0] === 1; 
    return val === 1 || val === '1' || val === true || val === 'true';
};

// ================================================================
// 🚀 2. Controllers
// ================================================================
const masterController = {
  // ดึงหมวดหมู่ทั้งหมด
  getCategories: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ดึงซัพพลายเออร์ทั้งหมด
  getSuppliers: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM suppliers WHERE is_active = true ORDER BY name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ดึงหน่วยนับทั้งหมด
  getUnits: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, unit_name FROM units WHERE is_active = true ORDER BY unit_name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching units:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  syncMasterData: async (req, res) => {
    const targetBranchId = cleanInt(req.body.branch_id, 0);
    const pgClient = await pool.connect();

    try {
        await pgClient.query('BEGIN');
        let totalSynced = 0;
        let branchesToSync = [];
        let errorLogs = [];

        if (targetBranchId === 0) {
            const branchRes = await pgClient.query('SELECT id, branch_name FROM branches WHERE is_active = true ORDER BY id ASC');
            branchesToSync = branchRes.rows;
        } else {
            branchesToSync = [{ id: targetBranchId, branch_name: `สาขา ${targetBranchId}` }];
        }
        const startTime = Date.now();
        // --- เริ่ม Loop วนทีละสาขา ---
        for (const branch of branchesToSync) {
            try {
                console.log(`[Sync] กำลังดึงข้อมูลจาก MySQL Server: ${branch.branch_name}...`);
                const mysqlPool = await getMysqlConnection(branch.id);

                // ========================================================
                // 📦 ส่วนที่ 1: ดึง wood_size (รหัสสินค้า)
                // ========================================================
                const [oldWoodSizes] = await mysqlPool.query(`
                    SELECT 
                        id AS id_old, length, thick, type_id, width, wood_code, mil, ax_code, 
                        is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood
                    FROM wood_size
                `);

                if (oldWoodSizes.length > 0) {
                    const values = oldWoodSizes.map(row => [
                        cleanInt(row.id_old),                  
                        branch.id,                             
                        cleanInt(row.length),                  
                        cleanInt(row.thick),                   
                        cleanInt(row.type_id, null),           
                        cleanInt(row.width),                   
                        row.wood_code || null,                 
                        cleanInt(row.mil),                     
                        row.ax_code === '\\N' || !row.ax_code ? null : row.ax_code, 
                        cleanBool(row.is_active, true),        
                        cleanBool(row.is_special, false),      
                        cleanInt(row.pallet_quantity),         
                        cleanFloat(row.wage),                  
                        cleanFloat(row.wage_sorting_cut_wood)  
                    ]);

                    const chunkSize = 4000;
                    for (let i = 0; i < values.length; i += chunkSize) {
                        const chunk = values.slice(i, i + chunkSize);
                        const upsertQuery = format(`
                            INSERT INTO master_wood_sizes (
                                old_id, branch_id, length, thick, type_id, width, wood_code, mil, 
                                ax_code, is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood
                            ) 
                            VALUES %L 
                            ON CONFLICT (branch_id, old_id) 
                            DO UPDATE SET 
                                length = EXCLUDED.length,
                                thick = EXCLUDED.thick,
                                type_id = EXCLUDED.type_id,
                                width = EXCLUDED.width,
                                wood_code = EXCLUDED.wood_code,
                                mil = EXCLUDED.mil,
                                ax_code = EXCLUDED.ax_code,
                                is_active = EXCLUDED.is_active,
                                is_special = EXCLUDED.is_special,
                                pallet_quantity = EXCLUDED.pallet_quantity,
                                wage = EXCLUDED.wage,
                                wage_sorting_cut_wood = EXCLUDED.wage_sorting_cut_wood,
                                updated_at = CURRENT_TIMESTAMP
                        `, chunk);

                        await pgClient.query(upsertQuery);
                    }
                    totalSynced += oldWoodSizes.length;
                    console.log(`[Sync] ✔ ซิงค์รหัสสินค้า ${branch.branch_name} สำเร็จ (${oldWoodSizes.length} รายการ)`);
                }

                // ========================================================
                // 🚚 ส่วนที่ 2: ดึง truck_company (บริษัทคู่ค้า)
                // ✅ แก้ไข: ขยับเข้ามาอยู่ใน Try Block ของ Loop สาขาเรียบร้อยแล้ว
                // ========================================================
                console.log(`[Sync] กำลังดึงข้อมูล เจ้าหนี้/บริษัทคู่ค้า จาก MySQL Server: ${branch.branch_name}...`);
                const [oldTrucks] = await mysqlPool.query(`
                    SELECT id AS id_old, code, name, remark, is_active FROM truck_company
                `);

                if (oldTrucks.length > 0) {
                    const truckValues = oldTrucks.map(row => [
                        cleanInt(row.id_old),                  
                        branch.id, // ตอนนี้มันรู้จัก branch.id แล้วครับ
                        row.code || null,                      
                        row.name || null,                      
                        row.remark || null,                    
                        cleanBool(row.is_active, true)         
                    ]);

                    const chunkTruckSize = 4000;
                    for (let i = 0; i < truckValues.length; i += chunkTruckSize) {
                        const chunk = truckValues.slice(i, i + chunkTruckSize);
                        
                        const upsertTruckQuery = format(`
                            INSERT INTO master_truck_companies (
                                old_id, branch_id, code, name, remark, is_active
                            ) 
                            VALUES %L 
                            ON CONFLICT (branch_id, old_id) 
                            DO UPDATE SET 
                                code = EXCLUDED.code,
                                name = EXCLUDED.name,
                                remark = EXCLUDED.remark,
                                is_active = EXCLUDED.is_active,
                                updated_at = CURRENT_TIMESTAMP;
                        `, chunk);

                        await pgClient.query(upsertTruckQuery);
                    }
                    console.log(`[Sync] ✔ ซิงค์บริษัทคู่ค้า ${branch.branch_name} สำเร็จ (${oldTrucks.length} รายการ)`);
                }

            } catch (branchError) {
                // ถ้าสาขาไหนมีปัญหา (เช่น ดึงข้อมูลไม่ได้, เชื่อมต่อไม่ติด) ให้โชว์ Error แล้วข้ามไปสาขาถัดไป
                console.error(`[Sync] ❌ ข้าม ${branch.branch_name} เนื่องจาก:`, branchError.message);
                errorLogs.push(`- ${branch.branch_name}: ${branchError.message}`);
            }
        } 
        // --- จบ Loop ของสาขา ---

        // บันทึกข้อมูลลงฐานข้อมูล PostgreSQL
        await pgClient.query('COMMIT');
        
        // ส่งแจ้งเตือนถ้ามี Error ตกค้าง
        if (errorLogs.length > 0) {
            const alertMessage = `\n⚠️ แจ้งเตือน PPOS Sync\nอัปเดตข้อมูลสำเร็จบางส่วน พบข้อผิดพลาด:\n${errorLogs.join('\n')}`;
            // เช็คก่อนว่ามีฟังก์ชันส่ง LINE หรือไม่ ถ้าไม่มีก็ไม่ส่ง ป้องกันระบบแครช
            if (typeof sendLineNotify !== 'undefined') await sendLineNotify(alertMessage);
        }

        // ⏱️ 2. สิ้นสุดการทำงานและคำนวณเวลา (วินาที)
        const endTime = Date.now();
        const syncTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);

        res.status(200).json({ 
            success: true, 
            message: errorLogs.length > 0 ? 'ซิงค์สำเร็จ แต่มีบางสาขาขัดข้อง (แจ้งเตือนผู้ดูแลแล้ว)' : 'ซิงค์ข้อมูลเสร็จสมบูรณ์',
            total_synced: totalSynced,
            sync_time: syncTimeSeconds
        });

    } catch (fatalError) {
        await pgClient.query('ROLLBACK');
        console.error('Fatal Sync Error:', fatalError);
        
        const criticalMessage = `\n🚨 PPOS Database Error!\nระบบซิงค์ล้มเหลวทั้งหมด\nสาเหตุ: ${fatalError.message}`;
        if (typeof sendLineNotify !== 'undefined') await sendLineNotify(criticalMessage);

        res.status(500).json({ success: false, message: 'ระบบฐานข้อมูลขัดข้อง แจ้งเตือนผู้ดูแลระบบแล้ว' });
    } finally {
        pgClient.release(); 
    }
  }
};

module.exports = masterController;