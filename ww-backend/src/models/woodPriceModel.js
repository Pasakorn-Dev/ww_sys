const pool = require('../config/db');
const format = require('pg-format'); // 💡 ต้องมีบรรทัดนี้เพื่อให้ N+1 Bulk Update ทำงานได้

const WoodPriceModel = {
  // ─── 1. ดึงข้อมูลราคาไม้เลื่อยตามสาขาและตัวกรอง ───
  getWoodPrices: async (filters) => {
    const { branch_id, mil, thick, width, length, wood_code } = filters;
    
    let query = `
      SELECT id, wood_code, thick, width, length, mil, unit_price 
      FROM master_wood_sizes 
      WHERE type_id = 1 AND branch_id = $1 AND is_active = true
    `;
    const params = [branch_id];
    let paramIndex = 2;

    // ต่อ String ค้นหาตามเงื่อนไข (Dynamic Query)
    if (mil) { query += `AND mil = $${paramIndex++}`; params.push(mil); }
    if (thick) { query += ` AND thick = $${paramIndex++}`; params.push(thick); }
    if (width) { query += ` AND width = $${paramIndex++}`; params.push(width); }
    if (length) { query += ` AND length = $${paramIndex++}`; params.push(length); }
    if (wood_code) { query += ` AND wood_code ILIKE $${paramIndex++}`; params.push(`%${wood_code}%`); }

    query += ` ORDER BY thick ASC, width ASC, length ASC limit 500`; // 💡 เพิ่ม limit เพื่อป้องกันดึงข้อมูลเยอะเกินไป

    const { rows } = await pool.query(query, params);
    return rows;
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updatedCount = 0;
      
      // 💡 หั่นข้อมูลเป็นก้อน ก้อนละ 2,000 แถว เพื่อไม่ให้ Query ใหญ่เกินไป
      const chunkSize = 2000;
      
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        
        // 💡 สร้างคำสั่ง Bulk Update โดยการจับคู่รหัสสินค้ากับตารางเสมือน (VALUES)
        const updateQuery = format(`
          UPDATE master_wood_sizes AS m
          SET 
            unit_price = CAST(v.unit_price AS NUMERIC), 
            updated_at = CURRENT_TIMESTAMP 
          FROM (VALUES %L) AS v(unit_price, branch_id, wood_code)
          WHERE m.branch_id = CAST(v.branch_id AS INTEGER) 
            AND m.wood_code = CAST(v.wood_code AS VARCHAR) 
            AND m.type_id = 1;
        `, chunk);

        const result = await client.query(updateQuery);
        updatedCount += result.rowCount; 
      }
      
      await client.query('COMMIT');
      return updatedCount;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = WoodPriceModel;