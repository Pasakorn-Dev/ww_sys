const pool = require('../config/db');
const format = require('pg-format'); // 💡 ต้องมีบรรทัดนี้เพื่อให้ N+1 Bulk Update ทำงานได้

const WoodPriceModel = {
  // ─── 1. ดึงข้อมูลราคาไม้เลื่อยตามสาขาและตัวกรอง ───
  getWoodPrices: async (filters) => {
    const { branch_id, mil, thick, width, length, wood_code ,paramExport} = filters;
    
    let query = `
      SELECT id, wood_code, thick, width, length, mil, unit_price 
      FROM master_wood_sizes 
      WHERE type_id = 1 AND branch_id = $1 AND is_active = true
    `;
    const params = [branch_id];
    let paramIndex = 2;

    // ต่อ String ค้นหาตามเงื่อนไข (Dynamic Query)ss
    if (mil) { query += `AND mil = $${paramIndex++}`; params.push(mil); }
    if (thick) { query += ` AND thick = $${paramIndex++}`; params.push(thick); }
    if (width) { query += ` AND width = $${paramIndex++}`; params.push(width); }
    if (length) { query += ` AND length = $${paramIndex++}`; params.push(length); }
    if (wood_code) { query += ` AND wood_code ILIKE $${paramIndex++}`; params.push(`%${wood_code}%`); }
    
    if (paramExport){
      query += ` AND unit_price <> 0`;
      query += ` ORDER BY thick ASC, width ASC, length ASC`;
    }else{
      query += ` AND unit_price <> 0`;
      query += ` ORDER BY thick ASC, width ASC, length ASC limit 500`; // 💡 เพิ่ม limit เพื่อป้องกันดึงข้อมูลเยอะเกินไป
    }
    

    const { rows } = await pool.query(query, params);
    return rows;
  },

  getBranchFileName: async(branch_id) => {
    
    let query = `select branch_code from branches where id = $1 limit 1`;

    const { rows } = await pool.query(query,[branch_id]);
    // 💡 ถ้าระบบค้นเจอข้อมูล ให้ดึงเฉพาะข้อความ 'branch_code' ออกมาส่งกลับ
    if (rows.length > 0) {
        return rows[0].branch_code; 
    }
    
    // 💡 ถ้าไม่เจอข้อมูล (เผื่อไว้) ให้ส่งคำว่า Unknown กลับไป
    return 'Unknown';
  },

  // ─── 2. อัปเดตราคาแบบ Bulk (ตาม ID) - ใช้สำหรับหน้าเว็บ ───
  updatePricesByIds: async (prices) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const item of prices) {
        await client.query(
          `UPDATE master_wood_sizes SET unit_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [item.unit_price, item.id]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ─── 🚀 3. แก้ไข: อัปเดตราคาแบบ Bulk สำหรับ Import Excel ให้เร็วขึ้น 100 เท่า ───
  updatePricesByCodes: async (branchId, updates) => {
    // ขอเชื่อมต่อ Database จาก Pool (เพื่อใช้คำสั่ง Transaction)
    const client = await pool.connect();
    try {
      // ใช้งาน Transaction: ป้องกันข้อมูลแหว่ง ถ้ามีพังระหว่างอัปเดต จะได้กู้ข้อมูลเดิมกลับมาทั้งหมด
      await client.query('BEGIN');
      let updatedCount = 0; // ตัวแปรเก็บจำนวนแถวที่อัปเดตได้จริง
      
      // 💡 หั่นข้อมูลเป็นก้อน ก้อนละ 2,000 แถว เพราะ Query ของ Postgres รับ Parameter ได้จำกัดความยาว
      const chunkSize = 2000;
      
      // วนลูปตามก้อนข้อมูล (เช่น ก้อนแรกรอบที่ 0-1999)
      for (let i = 0; i < updates.length; i += chunkSize) {
        // ตัด Array ใหญ่ ให้เหลือเฉพาะชุดที่จะทำงานรอบนี้
        const chunk = updates.slice(i, i + chunkSize);
        
        // 💡 สร้างคำสั่ง Bulk Update โดยใช้ตัวช่วย `format` (%L จะแปลง Array เป็นค่า Value ให้ SQL อ่านได้)
        const updateQuery = format(`
          UPDATE master_wood_sizes AS m
          SET 
            unit_price = CAST(v.unit_price AS NUMERIC), 
            updated_at = CURRENT_TIMESTAMP 
          -- สร้างตารางเสมือนที่ชื่อ v ขึ้นมาเทียบ (ประกอบด้วย ฟิลด์: ราคา, รหัสสาขา, รหัสไม้)
          FROM (VALUES %L) AS v(unit_price, branch_id, wood_code)
          -- *** เงื่อนไขการอัปเดต (ดูคำตอบด้านล่าง) ***
          WHERE m.branch_id = CAST(v.branch_id AS INTEGER) 
            AND m.wood_code = CAST(v.wood_code AS VARCHAR) 
            AND m.type_id = 1;
        `, chunk);

        // ยิงคำสั่ง SQL ที่สร้างเสร็จแล้วเข้าฐานข้อมูล
        const result = await client.query(updateQuery);
        // นับว่าฐานข้อมูลอัปเดตไปจริงๆ กี่แถว
        updatedCount += result.rowCount; 
      }
      
      // ยืนยันการเปลี่ยนแปลงข้อมูลลง Database อย่างเป็นทางการ
      await client.query('COMMIT');
      // ส่งจำนวนแถวที่เปลี่ยนกลับไปให้ Controller
      return updatedCount;
    } catch (error) {
      // ถ้ายิง Database แล้วระเบิด (Error) ให้ยกเลิกการเปลี่ยนแปลงทั้งหมด
      await client.query('ROLLBACK');
      throw error; // โยน Error ไปให้ตัวเรียกมัน (importExcel) ไปทำต่อ
    } finally {
      // ปิดและคืน Connection ให้ระบบ
      client.release();
    }
  }
};

module.exports = WoodPriceModel;