const pool = require('../config/db');

const productModel = {
  // ดึงสินค้าทั้งหมดพร้อมชื่อหมวดหมู่, ซัพพลายเออร์, หน่วยนับ
  getAllProducts: async () => {
    const query = `
      SELECT 
        p.*, 
        c.name AS category_name, 
        s.name AS supplier_name, 
        u.unit_name AS unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN units u ON p.unit_id = u.id
      ORDER BY p.id DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  // ดึงสินค้าตาม ID
  getProductById: async (id) => {
    const query = 'SELECT * FROM products WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // เพิ่มสินค้าใหม่
  createProduct: async (data) => {
    const {
      barcode, name, category_id, supplier_id, unit_id,
      price, reorder_point, is_active
    } = data;

    const query = `
      INSERT INTO products (
        barcode, name, category_id, supplier_id, unit_id,
        price, reorder_point, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      barcode || null, name, category_id || null, supplier_id || null,
      unit_id || null, price || 0, reorder_point || 0,
      is_active !== undefined ? is_active : true
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // แก้ไขสินค้า
  updateProduct: async (id, data) => {
    const {
      barcode, name, category_id, supplier_id, unit_id,
      price, reorder_point, is_active
    } = data;

    const query = `
      UPDATE products SET
        barcode = $1,
        name = $2,
        category_id = $3,
        supplier_id = $4,
        unit_id = $5,
        price = $6,
        reorder_point = $7,
        is_active = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    const values = [
      barcode || null, name, category_id || null, supplier_id || null,
      unit_id || null, price || 0, reorder_point || 0,
      is_active !== undefined ? is_active : true,
      id
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // ลบสินค้า
  deleteProduct: async (id) => {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // ดึงราคาสาขาของสินค้า ตามสิทธิ์ access_level ของ User (ดึงจาก group_permissions ตามเมนู)
  getBranchPricesByProduct: async (productId, user) => {
    const userId = user.id;
    const branchId = user.branch_id;
    const accessLevel = Number(user.access_level || 3); // ดึงจาก permissionMiddleware (ตามเมนู /products)
    
    // Debug log
    console.log('=== getBranchPricesByProduct Debug ===');
    console.log('Product ID:', productId, 'User ID:', userId, 'Branch ID:', branchId);
    console.log('Access Level (จาก permission middleware):', accessLevel);
    console.log('Access Level === 3 (Staff):', accessLevel === 3);

    let query = '';
    let params = [productId];

    if (accessLevel === 1) {
      // Level 1: Admin เห็นและตั้งราคาได้ทุกสาขา
      query = `
        SELECT 
          b.id AS branch_id, 
          b.branch_name AS branch_name, 
          pbp.price, 
          COALESCE(pbp.reorder_point, 0) AS reorder_point, 
          COALESCE(pbp.is_active, true) AS is_active
        FROM branches b
        LEFT JOIN product_branch_prices pbp 
               ON b.id = pbp.branch_id AND pbp.product_id = $1
        ORDER BY b.id ASC
      `;
    } else {
      // ตรวจสอบก่อนว่าผู้ใช้งานมีการแมปสาขาไว้ในตาราง user_branches หรือไม่
      const checkRes = await pool.query(
        'SELECT 1 FROM user_branches WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (checkRes.rows.length > 0) {
        // กรณีมีการกำหนดสิทธิ์หลายสาขาในตาราง user_branches
        params.push(userId);
        query = `
          SELECT 
            b.id AS branch_id, 
            b.branch_name AS branch_name, 
            pbp.price, 
            COALESCE(pbp.reorder_point, 0) AS reorder_point, 
            COALESCE(pbp.is_active, true) AS is_active
          FROM branches b
          INNER JOIN user_branches ub ON b.id = ub.branch_id AND ub.user_id = $2
          LEFT JOIN product_branch_prices pbp 
                 ON b.id = pbp.branch_id AND pbp.product_id = $1
          ORDER BY b.id ASC
        `;
      } else {
        // กรณีไม่มีข้อมูลใน user_branches ให้ดึงเฉพาะสาขาหลักของผู้ใช้ (branch_id ในตาราง users)
        params.push(branchId);
        query = `
          SELECT 
            b.id AS branch_id, 
            b.branch_name AS branch_name, 
            pbp.price, 
            COALESCE(pbp.reorder_point, 0) AS reorder_point, 
            COALESCE(pbp.is_active, true) AS is_active
          FROM branches b
          LEFT JOIN product_branch_prices pbp 
                 ON b.id = pbp.branch_id AND pbp.product_id = $1
          WHERE b.id = $2
          ORDER BY b.id ASC
        `;
      }
    }

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // บันทึก/อัปเดตราคาสาขา (UPSERT / DELETE ถ้าราคาเป็นค่าว่าง)
  saveBranchPrices: async (productId, prices) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of prices) {
        const priceVal = item.price !== '' && item.price !== null && item.price !== undefined ? Number(item.price) : null;
        const reorderVal = item.reorder_point !== '' && item.reorder_point !== null ? Number(item.reorder_point) : 0;
        const isActiveVal = item.is_active !== undefined ? Boolean(item.is_active) : true;

        if (priceVal !== null && !isNaN(priceVal)) {
          const upsertQuery = `
            INSERT INTO product_branch_prices (product_id, branch_id, price, reorder_point, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (product_id, branch_id) 
            DO UPDATE SET 
              price = EXCLUDED.price,
              reorder_point = EXCLUDED.reorder_point,
              is_active = EXCLUDED.is_active,
              updated_at = CURRENT_TIMESTAMP
          `;
          await client.query(upsertQuery, [productId, item.branch_id, priceVal, reorderVal, isActiveVal]);
        } else {
          const deleteQuery = `
            DELETE FROM product_branch_prices 
            WHERE product_id = $1 AND branch_id = $2
          `;
          await client.query(deleteQuery, [productId, item.branch_id]);
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = productModel;