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

        if (targetBranchId === 0) {
            const branchRes = await pgClient.query('SELECT id, branch_name FROM branches WHERE is_active = true ORDER BY id ASC');
            branchesToSync = branchRes.rows;
        } else {
            branchesToSync = [{ id: targetBranchId, branch_name: `สาขา ${targetBranchId}` }];
        }
        
        const startTime = Date.now();
        
        // --- เริ่ม Loop วนทีละสาขา ---
        // 💡 เอา try...catch ด้านในออก เพื่อให้ Error เด้งออกไปที่ catch หลักทันที
        for (const branch of branchesToSync) {
            console.log(`[Sync] กำลังดึงข้อมูลจาก MySQL Server: ${branch.branch_name}...`);
            const mysqlPool = await getMysqlConnection(branch.id);

            // ========================================================
            // 📦 ส่วนที่ 1: ดึง wood_size (รหัสสินค้า)
            // ========================================================
            const [oldWoodSizes] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, length, thick, type_id, width, wood_code, mil, ax_code, 
                    is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood ,grade
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
                    cleanFloat(row.wage_sorting_cut_wood),
                    row.grade || null
                ]);

                const chunkSize = 4000;
                for (let i = 0; i < values.length; i += chunkSize) {
                    const chunk = values.slice(i, i + chunkSize);
                    const upsertQuery = format(`
                        INSERT INTO master_wood_sizes (
                            old_id, branch_id, length, thick, type_id, width, wood_code, mil, 
                            ax_code, is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood, grade
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            length = EXCLUDED.length,
                            thick = EXCLUDED.thick,
                            type_id = EXCLUDED.type_id,
                            width = EXCLUDED.width,
                            wood_code = EXCLUDED.wood_code,
                            grade = EXCLUDED.grade,
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
            } else {
                console.warn(`[Warning] ไม่พบข้อมูลรหัสสินค้าใน ${branch.branch_name}`);
            }

            // ========================================================
            // 🚚 ส่วนที่ 2: ดึง truck_company (บริษัทคู่ค้า)
            // ========================================================
            console.log(`[Sync] กำลังดึงข้อมูล เจ้าหนี้/บริษัทคู่ค้า จาก MySQL Server: ${branch.branch_name}...`);
            const [oldTrucks] = await mysqlPool.query(`
                SELECT id AS id_old, code, name, remark, is_active FROM truck_company
            `);

            if (oldTrucks.length > 0) {
                const truckValues = oldTrucks.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id, 
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
                totalSynced += oldTrucks.length;
                console.log(`[Sync] ✔ ซิงค์บริษัทคู่ค้า ${branch.branch_name} สำเร็จ (${oldTrucks.length} รายการ)`);
            }

            // =================================================================
            // 👷‍♂️ ส่วนที่ 3: ดึงข้อมูลตาราง พนักงาน/นายม้า (employee)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล พนักงาน จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldEmployees] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, code, flag, name, status, title, name_en 
                FROM employee
            `);

            if (oldEmployees.length > 0) {
                const employeeValues = oldEmployees.map(row => {
                    const isActive = (row.status === 'AC');
                    return [
                        cleanInt(row.id_old),                  
                        branch.id,                             
                        row.code || null,                      
                        cleanInt(row.flag, 0),                 
                        row.name || null,                      
                        row.status || null,                    
                        row.title || null,                     
                        row.name_en || null,                   
                        isActive                               
                    ];
                });

                const chunkEmpSize = 4000;
                for (let i = 0; i < employeeValues.length; i += chunkEmpSize) {
                    const chunk = employeeValues.slice(i, i + chunkEmpSize);
                    
                    const upsertEmpQuery = format(`
                        INSERT INTO master_employees (
                            old_id, branch_id, code, flag, name, status, title, name_en, is_active
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            code = EXCLUDED.code,
                            flag = EXCLUDED.flag,
                            name = EXCLUDED.name,
                            status = EXCLUDED.status,
                            title = EXCLUDED.title,
                            name_en = EXCLUDED.name_en,
                            is_active = EXCLUDED.is_active,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertEmpQuery);
                }
                totalSynced += oldEmployees.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลพนักงาน ${branch.branch_name} สำเร็จ (${oldEmployees.length} รายการ)`);
            }

            // =================================================================
            // 🪵 ส่วนที่ 4: ดึงข้อมูลตาราง ประเภทไม้ท่อน (LogWoodType)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ประเภทไม้ท่อน จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldLogWoodTypes] = await mysqlPool.query(`
                SELECT id AS id_old, name, code, is_active FROM choice_domain WHERE choice_domain.class = 'com.ww.log.LogWoodTypeChoice'
            `);

            if (oldLogWoodTypes.length > 0) {
                const logWoodValues = oldLogWoodTypes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.name || null,                      
                    row.code || null,                      
                    cleanBool(row.is_active, true)         
                ]);

                const chunkLogSize = 4000;
                for (let i = 0; i < logWoodValues.length; i += chunkLogSize) {
                    const chunk = logWoodValues.slice(i, i + chunkLogSize);
                    
                    const upsertLogQuery = format(`
                        INSERT INTO master_log_wood_types (
                            old_id, branch_id, name, code, is_active
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            name = EXCLUDED.name,
                            code = EXCLUDED.code,
                            is_active = EXCLUDED.is_active,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertLogQuery);
                }
                totalSynced += oldLogWoodTypes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลประเภทไม้ท่อน ${branch.branch_name} สำเร็จ (${oldLogWoodTypes.length} รายการ)`);
            }

            // =================================================================
            // 📏 ส่วนที่ 5: ดึงข้อมูลตาราง ขนาดไม้ท่อนประเมิน (LogWoodEvalSize)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ขนาดไม้ท่อนประเมิน จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldLogWoodEvalSizes] = await mysqlPool.query(`
                SELECT id AS id_old, name, code, is_active FROM choice_domain WHERE choice_domain.class = 'com.ww.log.LogWoodEvalSize'
            `);

            if (oldLogWoodEvalSizes.length > 0) {
                const evalSizeValues = oldLogWoodEvalSizes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.name || null,                      
                    row.code || null,                      
                    cleanBool(row.is_active, true)         
                ]);

                const chunkEvalSize = 4000;
                for (let i = 0; i < evalSizeValues.length; i += chunkEvalSize) {
                    const chunk = evalSizeValues.slice(i, i + chunkEvalSize);
                    
                    const upsertEvalSizeQuery = format(`
                        INSERT INTO master_log_wood_eval_sizes (
                            old_id, branch_id, name, code, is_active
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            name = EXCLUDED.name,
                            code = EXCLUDED.code,
                            is_active = EXCLUDED.is_active,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertEvalSizeQuery);
                }
                totalSynced += oldLogWoodEvalSizes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลขนาดไม้ท่อนประเมิน ${branch.branch_name} สำเร็จ (${oldLogWoodEvalSizes.length} รายการ)`);
            }

            // =================================================================
            // 🪚 ส่วนที่ 6: ดึงข้อมูลตาราง ประเภทการเลื่อยไม้ (saw_wood_type)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ประเภทการเลื่อยไม้ จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldSawWoodTypes] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, name, ax_location, ax_warehouse, is_raw_wood, is_width_wood ,code
                FROM saw_wood_type
            `);

            if (oldSawWoodTypes.length > 0) {
                const sawWoodValues = oldSawWoodTypes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.name || null,                      
                    row.ax_location || null,               
                    row.ax_warehouse || null,              
                    cleanBool(row.is_raw_wood, false),     
                    cleanBool(row.is_width_wood, false),   
                    row.code || null                       
                ]);

                const chunkSawSize = 4000;
                for (let i = 0; i < sawWoodValues.length; i += chunkSawSize) {
                    const chunk = sawWoodValues.slice(i, i + chunkSawSize);
                    
                    const upsertSawWoodQuery = format(`
                        INSERT INTO master_saw_wood_types (
                            old_id, branch_id, name, ax_location, ax_warehouse, is_raw_wood, is_width_wood ,code
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            name = EXCLUDED.name,
                            ax_location = EXCLUDED.ax_location,
                            ax_warehouse = EXCLUDED.ax_warehouse,
                            is_raw_wood = EXCLUDED.is_raw_wood,
                            is_width_wood = EXCLUDED.is_width_wood,
                            code = EXCLUDED.code,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertSawWoodQuery);
                }
                totalSynced += oldSawWoodTypes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลประเภทการเลื่อยไม้ ${branch.branch_name} สำเร็จ (${oldSawWoodTypes.length} รายการ)`);
            }

            // =================================================================
            // 💦 ส่วนที่ 7: ดึงข้อมูลตาราง ประเภทไม้เปียก (wet_wood_type)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ประเภทไม้เปียก จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldWetWoodTypes] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, name, is_buy_wood, ax_location, ax_warehouse 
                FROM wet_wood_type
            `);

            if (oldWetWoodTypes.length > 0) {
                const wetWoodValues = oldWetWoodTypes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.name || null,                      
                    cleanBool(row.is_buy_wood, false),     
                    row.ax_location || null,               
                    row.ax_warehouse || null               
                ]);

                const chunkWetSize = 4000;
                for (let i = 0; i < wetWoodValues.length; i += chunkWetSize) {
                    const chunk = wetWoodValues.slice(i, i + chunkWetSize);
                    
                    const upsertWetWoodQuery = format(`
                        INSERT INTO master_wet_wood_types (
                            old_id, branch_id, name, is_buy_wood, ax_location, ax_warehouse
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            name = EXCLUDED.name,
                            is_buy_wood = EXCLUDED.is_buy_wood,
                            ax_location = EXCLUDED.ax_location,
                            ax_warehouse = EXCLUDED.ax_warehouse,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertWetWoodQuery);
                }
                totalSynced += oldWetWoodTypes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลประเภทไม้เปียก ${branch.branch_name} สำเร็จ (${oldWetWoodTypes.length} รายการ)`);
            }

            // =================================================================
            // 🏭 ส่วนที่ 8: ดึงข้อมูลตาราง คลัง/สถานที่เก็บไม้ (wood_store)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล คลังสถานที่เก็บไม้ จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldWoodStores] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, description, allow_two_prefix, ax_location, ax_warehouse 
                FROM wood_store
            `);

            if (oldWoodStores.length > 0) {
                const woodStoreValues = oldWoodStores.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.description || null,               
                    cleanBool(row.allow_two_prefix, false),
                    row.ax_location || null,               
                    row.ax_warehouse || null               
                ]);

                const chunkStoreSize = 4000;
                for (let i = 0; i < woodStoreValues.length; i += chunkStoreSize) {
                    const chunk = woodStoreValues.slice(i, i + chunkStoreSize);
                    
                    const upsertWoodStoreQuery = format(`
                        INSERT INTO master_wood_stores (
                            old_id, branch_id, description, allow_two_prefix, ax_location, ax_warehouse
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            description = EXCLUDED.description,
                            allow_two_prefix = EXCLUDED.allow_two_prefix,
                            ax_location = EXCLUDED.ax_location,
                            ax_warehouse = EXCLUDED.ax_warehouse,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertWoodStoreQuery);
                }
                totalSynced += oldWoodStores.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลคลังสถานที่เก็บไม้ ${branch.branch_name} สำเร็จ (${oldWoodStores.length} รายการ)`);
            }

            // =================================================================
            // 🔄 ส่วนที่ 9: ดึงข้อมูลตาราง ประเภทธุรกรรม (transaction_type)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ประเภทธุรกรรม จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldTransactionTypes] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, code, name, name_en 
                FROM transaction_type
            `);

            if (oldTransactionTypes.length > 0) {
                const transactionTypeValues = oldTransactionTypes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.code || null,                      
                    row.name || null,                      
                    row.name_en || null                    
                ]);

                const chunkTxSize = 4000;
                for (let i = 0; i < transactionTypeValues.length; i += chunkTxSize) {
                    const chunk = transactionTypeValues.slice(i, i + chunkTxSize);
                    
                    const upsertTxQuery = format(`
                        INSERT INTO master_transaction_types (
                            old_id, branch_id, code, name, name_en
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            code = EXCLUDED.code,
                            name = EXCLUDED.name,
                            name_en = EXCLUDED.name_en,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertTxQuery);
                }
                totalSynced += oldTransactionTypes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลประเภทธุรกรรม ${branch.branch_name} สำเร็จ (${oldTransactionTypes.length} รายการ)`);
            }

            // =================================================================
            // ⏱️ ส่วนที่ 10: ดึงข้อมูลตาราง ช่วงเวลาการเลื่อย (saw_time)
            // =================================================================
            console.log(`[Sync] กำลังดึงข้อมูล ช่วงเวลาการเลื่อย จาก MySQL Server: ${branch.branch_name}...`);
            
            const [oldSawTimes] = await mysqlPool.query(`
                SELECT 
                    id AS id_old, time_name, over_time, overtime_type 
                FROM saw_time
            `);

            if (oldSawTimes.length > 0) {
                const sawTimeValues = oldSawTimes.map(row => [
                    cleanInt(row.id_old),                  
                    branch.id,                             
                    row.time_name || null,                 
                    cleanBool(row.over_time, false),       
                    cleanInt(row.overtime_type, 0)         
                ]);

                const chunkTimeSize = 4000;
                for (let i = 0; i < sawTimeValues.length; i += chunkTimeSize) {
                    const chunk = sawTimeValues.slice(i, i + chunkTimeSize);
                    
                    const upsertSawTimeQuery = format(`
                        INSERT INTO master_saw_times (
                            old_id, branch_id, time_name, over_time, overtime_type
                        ) 
                        VALUES %L 
                        ON CONFLICT (branch_id, old_id) 
                        DO UPDATE SET 
                            time_name = EXCLUDED.time_name,
                            over_time = EXCLUDED.over_time,
                            overtime_type = EXCLUDED.overtime_type,
                            updated_at = CURRENT_TIMESTAMP;
                    `, chunk);

                    await pgClient.query(upsertSawTimeQuery);
                }
                totalSynced += oldSawTimes.length;
                console.log(`[Sync] ✔ ซิงค์ข้อมูลช่วงเวลาการเลื่อย ${branch.branch_name} สำเร็จ (${oldSawTimes.length} รายการ)`);
            }
        } 
        // --- จบ Loop ของสาขา ---

        // บันทึกข้อมูลลงฐานข้อมูล PostgreSQL
        await pgClient.query('COMMIT');
        
        // ⏱️ 2. สิ้นสุดการทำงานและคำนวณเวลา (วินาที)
        const endTime = Date.now();
        const syncTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);

        res.status(200).json({ 
            success: true, 
            message: 'ซิงค์ข้อมูลเสร็จสมบูรณ์',
            total_synced: totalSynced,
            sync_time: syncTimeSeconds
        });

    } catch (fatalError) {
        await pgClient.query('ROLLBACK');
        console.error('Fatal Sync Error:', fatalError);
        
        // 💡 ดึง Error Message จาก MySQL หรือ Postgres ส่งไปแสดงผลที่หน้าเว็บโดยตรง
        const errorMessage = fatalError.sqlMessage || fatalError.message || 'เกิดข้อผิดพลาดในฐานข้อมูล';
        const criticalMessage = `\n🚨 PPOS Database Error!\nระบบซิงค์ล้มเหลว\nสาเหตุ: ${errorMessage}`;
        
        if (typeof sendLineNotify !== 'undefined') {
            await sendLineNotify(criticalMessage).catch(console.error);
        }

        res.status(500).json({ 
            success: false, 
            message: `การซิงค์ล้มเหลว: ${errorMessage}` 
        });
    } finally {
        pgClient.release(); 
    }
  }
};

module.exports = masterController;