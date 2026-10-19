// นำเข้าเครื่องมือที่จำเป็น
const pool = require('../config/db'); // ตัวเชื่อมต่อฐานข้อมูล PostgreSQL (ระบบใหม่)
const format = require('pg-format'); // ตัวช่วยแปลง Array ให้เป็นคำสั่ง SQL (ใช้สำหรับเพิ่มข้อมูลทีละหลายพันบรรทัด)
const { getMysqlConnection } = require('../config/mysqlDb'); // ฟังก์ชันดึง Connection ของ MySQL (ระบบเก่า) แยกตามสาขา

// ================================================================
// 🛠️ 1. ฟังก์ชันตัวช่วย (Data Sanitizers)
// หน้าที่: ป้องกันแอปพังจากข้อมูลขยะ (เช่น ค่า null, ค่าว่าง, ตัวอักษรแปลกๆ) ที่มาจากระบบเก่า
// ================================================================

// แปลงข้อมูลเป็นตัวเลขจำนวนเต็ม (Integer)
const cleanInt = (val, defaultVal = 0) => {
    // ถ้าไม่มีค่า หรือเป็นสัญลักษณ์ \N (พบได้บ่อยตอน Export จาก MySQL) ให้ใช้ค่าเริ่มต้น (0)
    if (val === null || val === undefined || val === '\\N' || val === '') return defaultVal;
    const parsed = parseInt(val, 10); // พยายามแปลงเป็นตัวเลข
    return isNaN(parsed) ? defaultVal : parsed; // ถ้าแปลงแล้วไม่ใช่ตัวเลข (NaN) ให้คืนค่า 0
};

// แปลงข้อมูลเป็นตัวเลขทศนิยม (Float) สำหรับพวกราคาและปริมาตร
const cleanFloat = (val, defaultVal = 0.0000) => {
    if (val === null || val === undefined || val === '\\N' || val === '') return defaultVal;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
};

// แปลงข้อมูลเป็นค่าความจริง (Boolean: true/false)
const cleanBool = (val, defaultVal = false) => {
    if (val === null || val === undefined) return defaultVal;
    // MySQL บางเวอร์ชันเก็บ Boolean เป็นประเภท BIT (Buffer) ต้องดึงค่า index [0] มาเช็ค
    if (Buffer.isBuffer(val)) return val[0] === 1; 
    // รองรับทั้งกรณีส่งมาเป็นเลข 1, สตริง '1', ค่า true หรือสตริง 'true'
    return val === 1 || val === '1' || val === true || val === 'true';
};

// ================================================================
// 🚀 2. Controllers
// ================================================================
const masterController = {  
  // ฟังก์ชันหลักสำหรับซิงค์ข้อมูล (ถูกเรียกเมื่อกดปุ่มบนเว็บ หรือจาก Cron Job)
  syncMasterData: async (req, res) => {
    // 1. รับค่ารหัสสาขาที่ต้องการซิงค์ (ถ้าไม่ส่งมา หรือส่งมาเป็น 0 หมายถึงดึงทุกสาขา)
    const targetBranchId = cleanInt(req.body.branch_id, 0);
    
    // 2. ขอ Connection พิเศษจาก PostgreSQL เพื่อใช้ทำ Transaction (ป้องกันข้อมูลเข้าไม่ครบ)
    const pgClient = await pool.connect();

    try {
        // เริ่มต้น Transaction: ถ้ามี Error ระหว่างทาง ข้อมูลทั้งหมดในรอบนี้จะไม่ถูกบันทึก
        await pgClient.query('BEGIN');
        
        let totalSynced = 0; // ตัวนับจำนวนรายการทั้งหมดที่นำเข้าสำเร็จ
        let branchesToSync = []; // Array เก็บรายชื่อสาขาที่ต้องวนลูป
        let errorLogs = []; // Array เก็บข้อความ Error เพื่อรวบรวมไปส่ง LINE ทีเดียว

        // 3. กำหนดเป้าหมายการซิงค์
        if (targetBranchId === 0) {
            // กรณีเลือก "ทุกสาขา": ไปค้นหา ID สาขาที่เปิดใช้งานอยู่ทั้งหมดในระบบมาเตรียมไว้
            const branchRes = await pgClient.query('SELECT id, branch_name FROM branches WHERE is_active = true ORDER BY id ASC');
            branchesToSync = branchRes.rows;
        } else {
            // กรณีระบุสาขา: สร้าง Array ที่มีแค่สาขาเดียวนั้นๆ
            branchesToSync = [{ id: targetBranchId, branch_name: `สาขา ${targetBranchId}` }];
        }

        const startTime = Date.now(); // จับเวลาเริ่มต้น
        
        // 4. --- เริ่ม Loop วนทีละสาขา ---
        for (const branch of branchesToSync) {
            try { // ใช้ try-catch ครอบ "รายสาขา" เพื่อให้ถ้าสาขานี้พัง ระบบยังไปทำสาขาถัดไปต่อได้ ไม่ตายทั้งสคริปต์
                console.log(`[Sync] กำลังดึงข้อมูลจาก MySQL Server: ${branch.branch_name}...`);
                
                // ขอต่อฐานข้อมูล MySQL ประจำสาขานี้ (ใช้ IP/Password ตาม Branch ID)
                const mysqlPool = await getMysqlConnection(branch.id);

                // ========================================================
                // 📦 ส่วนที่ 1: ดึง wood_size (รหัสสินค้า)
                // ========================================================
                // สั่งยิง SQL ไปดึงข้อมูลทั้งหมดจากตาราง wood_size ของระบบเก่า
                const [oldWoodSizes] = await mysqlPool.query(`
                    SELECT 
                        id AS id_old, length, thick, type_id, width, wood_code, mil, ax_code, 
                        is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood
                    FROM wood_size
                `);

                // ถ้ามีข้อมูลส่งกลับมา
                if (oldWoodSizes.length > 0) {
                    // นำข้อมูลดิบมาจัดระเบียบและครอบด้วยฟังก์ชัน clean เพื่อกรองข้อมูลขยะ
                    const values = oldWoodSizes.map(row => [
                        cleanInt(row.id_old),                  
                        branch.id, // บังคับผูกข้อมูลนี้เข้ากับรหัสสาขาที่กำลังวนลูปอยู่                            
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

                    // หั่นข้อมูลเป็นก้อนๆ (Chunking) ก้อนละ 4,000 แถว ป้องกันข้อจำกัดของ PostgreSQL ที่รับตัวแปรต่อรอบได้จำกัด
                    const chunkSize = 4000;
                    for (let i = 0; i < values.length; i += chunkSize) {
                        const chunk = values.slice(i, i + chunkSize); // ตัดแบ่ง Array
                        
                        // ใช้ pg-format (%L) แปลง Array ให้กลายเป็น Value ก้อนใหญ่ใน SQL
                        const upsertQuery = format(`
                            INSERT INTO master_wood_sizes (
                                old_id, branch_id, length, thick, type_id, width, wood_code, mil, 
                                ax_code, is_active, is_special, pallet_quantity, wage, wage_sorting_cut_wood
                            ) 
                            VALUES %L 
                            ON CONFLICT (branch_id, old_id) -- ถ้าเจอรหัสเก่า+รหัสสาขา ซ้ำกัน ให้ทำสิ่งต่อไปนี้ (Upsert)
                            DO UPDATE SET 
                                length = EXCLUDED.length, -- เอาค่าใหม่ (EXCLUDED) ไปอัปเดตทับค่าเก่า
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

                        // สั่งประมวลผลคำสั่งที่เตรียมไว้
                        await pgClient.query(upsertQuery);
                    }
                    totalSynced += oldWoodSizes.length; // ทบยอดจำนวนที่ซิงค์สำเร็จ
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
                        id AS id_old, name, is_buy_wood, ax_location, ax_warehouse ,code
                    FROM wet_wood_type
                `);

                if (oldWetWoodTypes.length > 0) {
                    const wetWoodValues = oldWetWoodTypes.map(row => [
                        cleanInt(row.id_old),                  
                        branch.id,                             
                        row.name || null,                      
                        cleanBool(row.is_buy_wood, false),     
                        row.ax_location || null,               
                        row.ax_warehouse || null,
                        row.code || null             
                    ]);

                    const chunkWetSize = 4000;
                    for (let i = 0; i < wetWoodValues.length; i += chunkWetSize) {
                        const chunk = wetWoodValues.slice(i, i + chunkWetSize);
                        
                        const upsertWetWoodQuery = format(`
                            INSERT INTO master_wet_wood_types (
                                old_id, branch_id, name, is_buy_wood, ax_location, ax_warehouse, code
                            ) 
                            VALUES %L 
                            ON CONFLICT (branch_id, old_id) 
                            DO UPDATE SET 
                                name = EXCLUDED.name,
                                is_buy_wood = EXCLUDED.is_buy_wood,
                                ax_location = EXCLUDED.ax_location,
                                ax_warehouse = EXCLUDED.ax_warehouse,
                                code = EXCLUDED.code,
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
                        id AS id_old, description, allow_two_prefix, ax_location, ax_warehouse ,code
                    FROM wood_store
                `);

                if (oldWoodStores.length > 0) {
                    const woodStoreValues = oldWoodStores.map(row => [
                        cleanInt(row.id_old),                  
                        branch.id,                             
                        row.description || null,               
                        cleanBool(row.allow_two_prefix, false),
                        row.ax_location || null,               
                        row.ax_warehouse || null,               
                        row.code || null                        
                    ]);

                    const chunkStoreSize = 4000;
                    for (let i = 0; i < woodStoreValues.length; i += chunkStoreSize) {
                        const chunk = woodStoreValues.slice(i, i + chunkStoreSize);
                        
                        const upsertWoodStoreQuery = format(`
                            INSERT INTO master_wood_stores (
                                old_id, branch_id, description, allow_two_prefix, ax_location, ax_warehouse, code
                            ) 
                            VALUES %L 
                            ON CONFLICT (branch_id, old_id) 
                            DO UPDATE SET 
                                description = EXCLUDED.description,
                                allow_two_prefix = EXCLUDED.allow_two_prefix,
                                ax_location = EXCLUDED.ax_location,
                                ax_warehouse = EXCLUDED.ax_warehouse,
                                code = EXCLUDED.code,
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

            } catch (branchError) {
                // หากเซิร์ฟเวอร์ MySQL ของสาขานี้ล่ม หรือพาสเวิร์ดผิด จะหลุดมาที่นี่
                console.error(`[Sync] ❌ ข้าม ${branch.branch_name} เนื่องจาก:`, branchError.message);
                // จด Error ไว้ในสมุดโน้ต (Array) ก่อน ค่อยเอาไปแจ้ง LINE ทีเดียวตอนจบงาน
                errorLogs.push(`- ${branch.branch_name}: ${branchError.message}`);
            }
        } 
        // --- จบ Loop ครบทุกสาขา ---

        // 5. เมื่อลูปทำงานจบโดยไม่มี Fatal Error ให้ "ยืนยัน" การบันทึกข้อมูลเข้า Database จริงๆ
        await pgClient.query('COMMIT');
        
        // คำนวณระยะเวลาการทำงาน
        const syncTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // 6. ส่งแจ้งเตือนถ้ามี Error ตกค้างในบางสาขา
        if (errorLogs.length > 0 && typeof sendLineNotify !== 'undefined') {
            const alertMessage = `\n⚠️ แจ้งเตือน PPOS Sync\nอัปเดตข้อมูลสำเร็จบางส่วน พบข้อผิดพลาด:\n${errorLogs.join('\n')}`;
            await sendLineNotify(alertMessage);
        }

        // ส่งผลลัพธ์กลับไปยังผู้เรียกใช้ (Frontend หรือ Cron Job)
        res.status(200).json({ 
            success: true, 
            message: errorLogs.length > 0 ? 'ซิงค์สำเร็จ แต่มีบางสาขาขัดข้อง' : 'ซิงค์ข้อมูลเสร็จสมบูรณ์',
            total_synced: totalSynced,
            sync_time: syncTimeSeconds
        });

    } catch (fatalError) {
        // หากมี Error ระดับโครงสร้าง เช่น PostgreSQL ดับระหว่างทาง จะหลุดมาที่นี่
        await pgClient.query('ROLLBACK'); // ยกเลิกข้อมูลที่ยัดมาในรอบนี้ทิ้งทั้งหมด ป้องกันข้อมูลแหว่ง
        
        if (typeof sendLineNotify !== 'undefined') {
            const criticalMessage = `\n🚨 PPOS Database Error!\nระบบซิงค์ล้มเหลวทั้งหมด\nสาเหตุ: ${fatalError.message}`;
            await sendLineNotify(criticalMessage);
        }

        res.status(500).json({ success: false, message: 'ระบบฐานข้อมูลขัดข้อง แจ้งเตือนผู้ดูแลระบบแล้ว' });
    } finally {
        pgClient.release(); // คืนการเชื่อมต่อให้ Pool เสมอ เพื่อไม่ให้ระบบค้าง
    }
  }
};

module.exports = masterController;