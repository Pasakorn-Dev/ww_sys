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
          branch_id
        ];
      });

      // 5. เรียก Model เอาข้อมูลลงตาราง Transaction ด้วยเทคนิค N+1 Bulk Upsert
      const totalSynced = await TransactionModel.upsertTransactions(insertValues);

      res.json({ success: true, message: 'ซิงค์ข้อมูลสำเร็จ', total_synced: totalSynced });

    } catch (error) {
      console.error('Transaction Sync Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
    }
  }
};

module.exports = transactionController;