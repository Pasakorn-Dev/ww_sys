const pool = require('../config/db');
const format = require('pg-format');

const TransactionModel = {
  // ─── 1. ดึงราคากลาง (unit_price) จาก PostgreSQL ของสาขานั้น ───
  getUnitPricesByBranch: async (branchId) => {
    const query = `
      SELECT old_id, unit_price 
      FROM master_wood_sizes 
      WHERE branch_id = $1 AND type_id = 1
    `;
    const { rows } = await pool.query(query, [branchId]);
    
    // สร้างเป็น Map เพื่อให้ตอนจับคู่ (Map) ใน Controller ทำได้เร็วมาก (O(1))
    const priceMap = new Map();
    rows.forEach(row => {
      priceMap.set(row.old_id, Number(row.unit_price) || 0);
    });
    return priceMap;
  },

  // ─── 2. ดึงข้อมูล Transaction จาก MySQL เก่า ───
  getOldTransactions: async (mysqlPool, startDate, endDate) => {
    const mysqlQuery = `
      SELECT 
        a.produce_date, a.log_wood_type_id, a.log_wood_eval_size_id, a.ws_customer_id, 
        a.transaction_type_id, a.saw_time_id, a.saw_name, bc.barcode_id, 
        wsam.id AS wood_size_amount_map_id, wsam.amount,
        round(((MID(wz.wood_code,6,1)+MID(wz.wood_code,7,1)/8)*(IF(MID(wz.wood_code,8,1)="A",10,IF(MID(wz.wood_code,8,1)="B",11,IF(MID(wz.wood_code,8,1)="C",12,IF(MID(wz.wood_code,8,1)="D",13,IF(MID(wz.wood_code,8,1)="E",14,IF(MID(wz.wood_code,8,1)="F",15,IF(MID(wz.wood_code,8,1)="G",16,IF(MID(wz.wood_code,8,1)="H",17,IF(MID(wz.wood_code,8,1)="I",18,IF(MID(wz.wood_code,8,1)="J",19,IF(MID(wz.wood_code,8,1)="K",20,MID(wz.wood_code,8,1))))))))))))+MID(wz.wood_code,9,1)/8)*(RIGHT(wz.wood_code,3)/100)*0.0228 * wsam.amount),4) as volumn,
        wz.id AS wood_size_id, wsam.saw_wood_type_id
      FROM (
        SELECT lwqc.*, rws.id as rws_id, rws.barcode_id, rws.produce_date
        FROM (
          SELECT scale_date_time, log_wood_type_id, log_wood_eval_size_id, ws_customer_id, transaction_type_id, saw_time_id, saw_name
          FROM log_woodqc lwqc
          WHERE 1 = 1 AND scale_date_time >= ? AND scale_date_time <= ? AND weight <> 0
          GROUP BY scale_date_time, log_wood_type_id, log_wood_eval_size_id, ws_customer_id, transaction_type_id, saw_time_id, saw_name
        ) lwqc
        INNER JOIN (
          SELECT rws.id, rws.barcode_id, rws.saw_table_id, date(rws.produce_date) as produce_date, isws.code, rws.saw_time_id
          FROM raw_wood_source rws 
          LEFT JOIN interface_saw_worker_set isws ON isws.id = rws.interfaced_worker_set_id
          WHERE rws.produce_date >= ? AND rws.produce_date <= ?
        ) rws ON 1=1 
          AND date(rws.produce_date) = date(lwqc.scale_date_time) 
          AND rws.code = lwqc.saw_name 
          AND lwqc.saw_time_id = rws.saw_time_id
      ) a
      INNER JOIN barcode bc ON bc.id = a.barcode_id
      INNER JOIN mobile_raw_wood_data mrwd ON mrwd.raw_wood_source_id = a.rws_id
      INNER JOIN mobile_raw_wood_data_wood_size_amount_map mrwdwsam ON mrwdwsam.mobile_raw_wood_data_amount_map_id = mrwd.id
      INNER JOIN wood_size_amount_map wsam ON wsam.id = mrwdwsam.wood_size_amount_map_id
      INNER JOIN wood_size wz ON wz.id = wsam.wood_size_id
      WHERE wsam.amount <> 0
      GROUP BY wsam.id
    `;
    const [oldData] = await mysqlPool.query(mysqlQuery, [startDate, endDate, startDate, endDate]);
    return oldData;
  },

  // ─── 3. อัปเดตข้อมูลแบบ Bulk ลง PostgreSQL ───
  upsertTransactions: async (insertValues) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const chunkSize = 3000; // แบ่งเป็นก้อน ก้อนละ 3,000 แถว
      let totalSynced = 0;

      for (let i = 0; i < insertValues.length; i += chunkSize) {
        const chunk = insertValues.slice(i, i + chunkSize);
        
        const upsertQuery = format(`
          INSERT INTO transaction_saw_woods (
            wood_size_amount_map_id, barcode_id, produce_date, log_wood_type_id, log_wood_eval_size_id, 
            ws_customer_id, transaction_type_id, saw_time_id, saw_name, wood_size_id, saw_wood_type_id, 
            amount, volumn, unit_price, branch_id
          ) 
          VALUES %L 
          ON CONFLICT (wood_size_amount_map_id) 
          DO UPDATE SET 
            barcode_id = EXCLUDED.barcode_id,
            produce_date = EXCLUDED.produce_date,
            log_wood_type_id = EXCLUDED.log_wood_type_id,
            log_wood_eval_size_id = EXCLUDED.log_wood_eval_size_id,
            ws_customer_id = EXCLUDED.ws_customer_id,
            transaction_type_id = EXCLUDED.transaction_type_id,
            saw_time_id = EXCLUDED.saw_time_id,
            saw_name = EXCLUDED.saw_name,
            wood_size_id = EXCLUDED.wood_size_id,
            saw_wood_type_id = EXCLUDED.saw_wood_type_id,
            amount = EXCLUDED.amount,
            volumn = EXCLUDED.volumn,
            unit_price = EXCLUDED.unit_price,
            branch_id = EXCLUDED.branch_id
        `, chunk);

        await client.query(upsertQuery);
        totalSynced += chunk.length;
      }

      await client.query('COMMIT');
      return totalSynced;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = TransactionModel;