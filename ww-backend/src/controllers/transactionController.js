const { getMysqlConnection } = require('../config/mysqlDb');
const TransactionModel = require('../models/transactionModel');

const transactionController = {
  syncSawWoods: async (req, res) => {
    const { branch_id, start_date, end_date } = req.body;

    // ตรวจสอบข้อมูลก่อน
    if (!branch_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสาขา และช่วงวันที่ให้ครบถ้วน' });
    }

    try {
      // 1. เชื่อมต่อ MySQL ของสาขานั้น
      const mysqlPool = await getMysqlConnection(branch_id);

      // 2. เรียก Model ดึงราคา Unit Price ปัจจุบันจาก Postgres มาเตรียมไว้ (เป็น Map)
      const priceMap = await TransactionModel.getUnitPricesByBranch(branch_id);

      // 3. เรียก Model ดึงข้อมูลการนับไม้เลื่อยจาก MySQL เก่า
      const oldData = await TransactionModel.getOldTransactions(mysqlPool, start_date, end_date);

      // 🌟 3.1 สกัดเฉพาะ ID ที่ยังมีอยู่จริงในระบบเก่า (ใช้ Set เพื่อตัด ID ที่ซ้ำกันออก)
      const activeIds = [...new Set(oldData.map(row => row.wood_size_amount_map_id))];

      // 🌟 3.2 สั่งเคลียร์ข้อมูลใน PostgreSQL ที่ถูกลบออกไปแล้วใน MySQL 
      await TransactionModel.cleanupDeletedTransactions(branch_id, start_date, end_date, activeIds);

      if (oldData.length === 0) {
        return res.json({ success: true, message: 'ไม่พบข้อมูลในระบบเก่าสำหรับช่วงเวลานี้', total_synced: 0 });
      }

      // 4. เอาข้อมูลสองฝั่งมาจับคู่ (Map) เตรียมพร้อมเข้า Postgres
      const insertValues = oldData.map(row => {
        // 💡 แก้ไข: ดึง ปี-เดือน-วัน ตามเวลา Local (ไทย) แทนการใช้ toISOString() 
        let prodDate = row.produce_date;
        if (prodDate instanceof Date) {
          const year = prodDate.getFullYear();
          const month = String(prodDate.getMonth() + 1).padStart(2, '0');
          const day = String(prodDate.getDate()).padStart(2, '0');
          prodDate = `${year}-${month}-${day}`;
        }
        
        const unitPrice = priceMap.get(row.wood_size_id) || 0; // ถ้ารหัสตรงกัน ดึงราคามาใส่
        
        return [
          row.wood_size_amount_map_id,
          row.barcode_id,
          prodDate,
          row.log_wood_type_id || null,
          row.log_wood_eval_size_id || null,
          row.ws_customer_id || null,
          row.transaction_type_id || null,
          row.saw_time_id || null,
          row.saw_name || null,
          row.wood_size_id || null,
          row.saw_wood_type_id || null,
          row.amount || 0,
          row.volumn || 0,
          unitPrice,
          branch_id,
          row.sawer_id || null
        ];
      });

      // 5. เรียก Model เอาข้อมูลลงตาราง Transaction ด้วยเทคนิค N+1 Bulk Upsert
      const totalSynced = await TransactionModel.upsertTransactions(insertValues);

      res.json({ success: true, message: 'ซิงค์ข้อมูลสำเร็จ', total_synced: totalSynced });

    } catch (error) {
      console.error('Transaction Sync Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
    }
  },

  getSawWoods: async (req, res) => {
    try {
      const data = await TransactionModel.getSawWoods(req.query);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Fetch Saw Woods Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
  },

  // เพิ่มต่อจาก getSawWoods: async (req, res) => { ... },
  
  // ─── สั่งประมวลผล Recalculate (Background Job) ───
  recalculatePrices: async (req, res) => {
    const { branch_id, produce_date } = req.body;
    const user_id = req.user.id;

    if (!branch_id || !produce_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสาขาและวันที่ผลิต' });
    }

    try {
      // 1. สร้างสถานะ "กำลังประมวลผล" ลง Database 
      const logId = await TransactionModel.createRecalLog(branch_id, produce_date, user_id);

      // 2. ⚡ ส่ง Response "สำเร็จ" กลับไปที่หน้าเว็บทันที เพื่อไม่ให้จอค้าง (Non-blocking)
      res.json({ success: true, message: 'สั่งคำนวณใหม่สำเร็จ ระบบกำลังประมวลผลอยู่เบื้องหลัง' });

      // 3. ปล่อยให้ฟังก์ชันนี้ทำงานของมันไปเบื้องหลัง
      setTimeout(async () => {
        try {
          const updatedCount = await TransactionModel.executeRecalculation(branch_id, produce_date);
          // ทำเสร็จก็อัปเดตสถานะเป็น Success
          await TransactionModel.updateRecalLog(logId, 'Success', updatedCount);
        } catch (bgError) {
          console.error('Background Recalculation Error:', bgError);
          // ถ้ามีพังระหว่างทาง ให้อัปเดตสถานะเป็น Error
          await TransactionModel.updateRecalLog(logId, 'Error', 0, bgError.message);
        }
      }, 0);

    } catch (error) {
      console.error('Trigger Recalculation Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสั่งงาน' });
    }
  },

  // ─── ดึงประวัติการประมวลผล ───
  getRecalLogs: async (req, res) => {
    try {
      const { branch_id } = req.query;
      const logs = await TransactionModel.getRecalLogs(branch_id);
      res.json({ success: true, data: logs });
    } catch (error) {
      console.error('Get Recal Logs Error:', error);
      res.status(500).json({ success: false, message: 'ดึงข้อมูลประวัติไม่สำเร็จ' });
    }
  },

  // ─── ส่วนที่เพิ่มใหม่สำหรับ นำเข้าข้อมูลไม้เปียก ───
  syncWetWoods: async (req, res) => {
    const { branch_id, start_date, end_date } = req.body;

    if (!branch_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสาขา และช่วงวันที่ให้ครบถ้วน' });
    }

    try {
      // 1. เชื่อมต่อ MySQL ของสาขาที่ระบุ
      const mysqlPool = await getMysqlConnection(branch_id);

      // 2. ดึงค่าแรง (wage) ปัจจุบันจาก Postgres มาเตรียมไว้เพื่อคำนวณ
      const wageMap = await TransactionModel.getUnitWagesByBranch(branch_id);

      // 3. ดึงข้อมูลดิบจาก MySQL เก่า
      const oldData = await TransactionModel.getOldWetWoodTransactions(mysqlPool, start_date, end_date);

      // 3.1 สกัดเฉพาะ ID ที่ยังมีอยู่จริง เพื่อป้องกันข้อมูลค้าง
      const activeIds = [...new Set(oldData.map(row => row.wood_size_amount_map_id))];

      // 3.2 สั่งเคลียร์ข้อมูลที่ไม่มีแล้วในระบบเก่า
      await TransactionModel.cleanupDeletedWetWoodTransactions(branch_id, start_date, end_date, activeIds);

      if (oldData.length === 0) {
        return res.json({ success: true, message: 'ไม่พบข้อมูลไม้เปียกในระบบเก่าสำหรับช่วงเวลานี้', total_synced: 0 });
      }

      // 4. กรองแถวที่ซ้ำซ้อนกันใน MySQL (ป้องกัน ON CONFLICT เออเร่อ) และเตรียมข้อมูลใส่ Array
      const uniqueDataMap = new Map();
      oldData.forEach(row => {
        uniqueDataMap.set(row.wood_size_amount_map_id, row);
      });
      
      const insertValues = Array.from(uniqueDataMap.values()).map(row => {
        // จัดการวันที่ให้อยู่ในฟอร์แมต YYYY-MM-DD
        let prodDate = row.produce_date;
        if (prodDate instanceof Date) {
          const year = prodDate.getFullYear();
          const month = String(prodDate.getMonth() + 1).padStart(2, '0');
          const day = String(prodDate.getDate()).padStart(2, '0');
          prodDate = `${year}-${month}-${day}`;
        }
        
        const unitWage = wageMap.get(row.wood_size_id) || 0; 
        
        return [
          row.wood_size_amount_map_id,
          branch_id,
          row.barcode_id,
          prodDate,
          row.wood_size_id || null,
          row.wet_wood_type_id || null,
          row.sorter_id || null,
          row.ws_customer_id || null,
          row.amount || 0,
          row.volumn || 0,
          unitWage
        ];
      });

      // 5. นำเข้าข้อมูลลงตารางใหม่ (Bulk Upsert)
      const totalSynced = await TransactionModel.upsertWetWoodTransactions(insertValues);

      res.json({ success: true, message: 'ซิงค์ข้อมูลไม้เปียกสำเร็จ', total_synced: totalSynced });

    } catch (error) {
      console.error('Wet Wood Sync Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูลไม้เปียก' });
    }
  }
};

module.exports = transactionController;