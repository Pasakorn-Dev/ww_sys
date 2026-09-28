const pool = require('../config/db');

const ReportModel = {
  getProductionCoverReport: async (filters) => {
    const { branch_id, start_date, end_date, store_code } = filters;

    // Query จัดกลุ่มและรวมผลยอด amount และ volumn
    const query = `
      SELECT 
        b.branch_name,
        swt.code AS store_code,
        ws.is_special,
        ws.grade,
        ws.wood_code,
        SUM(t.amount) AS total_amount,
        SUM(t.volumn) AS total_volumn
      FROM transaction_saw_woods t
      INNER JOIN branches b ON t.branch_id = b.id
      INNER JOIN master_wood_sizes ws ON t.wood_size_id = ws.old_id AND t.branch_id = ws.branch_id
      LEFT JOIN master_saw_wood_types swt ON t.saw_wood_type_id = swt.old_id AND t.branch_id = swt.branch_id
      WHERE t.branch_id = $1
        AND t.produce_date BETWEEN $2 AND $3
        ${store_code ? `AND swt.code = $4` : ``}
      GROUP BY 
        b.branch_name, 
        swt.code, 
        ws.is_special, 
        ws.grade, 
        ws.wood_code
      ORDER BY 
        ws.is_special ASC, 
        ws.grade ASC, 
        ws.wood_code ASC
    `;

    const params = [branch_id, start_date, end_date];
    if (store_code) params.push(store_code);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // 💡 เพิ่มฟังก์ชันรูปแบบที่ 2 (จัดกลุ่มตามชุดเลื่อย)
  getProductionCoverReportFormat2: async (filters) => {
    const { branch_id, start_date, end_date, store_code } = filters;

    const query = `
      SELECT 
        b.branch_name,
        swt.code AS store_code,
        ws.is_special,
        ws.grade,
        t.saw_name,
        ws.wood_code,
        SUM(t.amount) AS total_amount,
        SUM(t.volumn) AS total_volumn
      FROM transaction_saw_woods t
      INNER JOIN branches b ON t.branch_id = b.id
      INNER JOIN master_wood_sizes ws ON t.wood_size_id = ws.old_id AND t.branch_id = ws.branch_id
      LEFT JOIN master_saw_wood_types swt ON t.saw_wood_type_id = swt.old_id AND t.branch_id = swt.branch_id
      WHERE t.branch_id = $1
        AND t.produce_date BETWEEN $2 AND $3
        ${store_code ? `AND swt.code = $4` : ``}
      GROUP BY 
        b.branch_name, 
        swt.code, 
        ws.is_special, 
        ws.grade, 
        t.saw_name, 
        ws.wood_code
      ORDER BY 
        t.saw_name ASC,
        ws.is_special ASC, 
        ws.grade ASC, 
        ws.wood_code ASC
    `;

    const params = [branch_id, start_date, end_date];
    if (store_code) params.push(store_code);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // เพิ่มต่อท้ายฟังก์ชันใน ReportModel
  getAveragePriceReport: async (filters) => {
    const { branch_id, start_date, end_date, store_code } = filters;

    // แก้ไข is_special: false = ปกติ, true = พิเศษ ให้ถูกต้องตามโครงสร้างระบบ
    const query = `
      WITH BaseData AS (
        SELECT 
          t.saw_name
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'AB' THEN t.volumn ELSE 0 END) AS vol_normal_ab
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'AB' THEN t.volumn ELSE 0 END) AS vol_special_ab
          ,SUM(CASE WHEN ws.grade = 'AB' THEN t.volumn ELSE 0 END) AS vol_ab
          
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'C' THEN t.volumn ELSE 0 END) AS vol_normal_c
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'C' THEN t.volumn ELSE 0 END) AS vol_special_c
          ,SUM(CASE WHEN ws.grade = 'C' THEN t.volumn ELSE 0 END) AS vol_c
        
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'P' THEN t.volumn ELSE 0 END) AS vol_normal_p
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'P' THEN t.volumn ELSE 0 END) AS vol_special_p
          ,SUM(CASE WHEN ws.grade = 'P' THEN t.volumn ELSE 0 END) AS vol_p
        
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'PP' THEN t.volumn ELSE 0 END) AS vol_normal_pp
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'PP' THEN t.volumn ELSE 0 END) AS vol_special_pp
          ,SUM(CASE WHEN ws.grade = 'PP' THEN t.volumn ELSE 0 END) AS vol_pp
        
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'AB' THEN t.net_price ELSE 0 END) AS price_normal_ab
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'AB' THEN t.net_price ELSE 0 END) AS price_special_ab
          ,SUM(CASE WHEN ws.grade = 'AB' THEN t.net_price ELSE 0 END) AS price_ab
          
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'C' THEN t.net_price ELSE 0 END) AS price_normal_c
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'C' THEN t.net_price ELSE 0 END) AS price_special_c
          ,SUM(CASE WHEN ws.grade = 'C' THEN t.net_price ELSE 0 END) AS price_c
        
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'P' THEN t.net_price ELSE 0 END) AS price_normal_p
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'P' THEN t.net_price ELSE 0 END) AS price_special_p
          ,SUM(CASE WHEN ws.grade = 'P' THEN t.net_price ELSE 0 END) AS price_p
        
          ,SUM(CASE WHEN ws.is_special = false AND ws.grade = 'PP' THEN t.net_price ELSE 0 END) AS price_normal_pp
          ,SUM(CASE WHEN ws.is_special = true AND ws.grade = 'PP' THEN t.net_price ELSE 0 END) AS price_special_pp
          ,SUM(CASE WHEN ws.grade = 'PP' THEN t.net_price ELSE 0 END) AS price_pp

          ,SUM(t.volumn) AS total_volumn
          ,SUM(t.net_price) AS total_price
        FROM transaction_saw_woods t
        INNER JOIN master_wood_sizes ws ON t.wood_size_id = ws.old_id AND t.branch_id = ws.branch_id
        LEFT JOIN master_saw_wood_types swt ON t.saw_wood_type_id = swt.old_id AND t.branch_id = swt.branch_id
        WHERE t.branch_id = $1
          AND t.produce_date BETWEEN $2 AND $3
          ${store_code ? `AND swt.code = $4` : ``}
        GROUP BY t.saw_name
      )
      SELECT 
        saw_name
        ,price_normal_ab, vol_normal_ab
        ,price_special_ab, vol_special_ab
        ,price_ab, vol_ab

        ,price_normal_c, vol_normal_c
        ,price_special_c, vol_special_c
        ,price_c, vol_c

        ,price_normal_p, vol_normal_p
        ,price_special_p, vol_special_p
        ,price_p, vol_p

        ,price_normal_pp, vol_normal_pp
        ,price_special_pp, vol_special_pp
        ,price_pp, vol_pp

        ,total_price, total_volumn

        ,(price_normal_ab / NULLIF(vol_normal_ab, 0)) AS normal_ab
        ,(price_special_ab / NULLIF(vol_special_ab, 0)) AS special_ab
        ,(price_ab / NULLIF(vol_ab, 0)) AS avg_ab

        ,(price_normal_c / NULLIF(vol_normal_c, 0)) AS normal_c
        ,(price_special_c / NULLIF(vol_special_c, 0)) AS special_c
        ,(price_c / NULLIF(vol_c, 0)) AS avg_c

        ,(price_normal_p / NULLIF(vol_normal_p, 0)) AS normal_p
        ,(price_special_p / NULLIF(vol_special_p, 0)) AS special_p
        ,(price_p / NULLIF(vol_p, 0)) AS avg_p

        ,(price_normal_pp / NULLIF(vol_normal_pp, 0)) AS normal_pp
        ,(price_special_pp / NULLIF(vol_special_pp, 0)) AS special_pp
        ,(price_pp / NULLIF(vol_pp, 0)) AS avg_pp

        ,(total_price / NULLIF(total_volumn, 0)) AS avg_total
      FROM BaseData 
      ORDER BY saw_name;
    `;

    const params = [branch_id, start_date, end_date];
    if (store_code) params.push(store_code);

    const { rows } = await pool.query(query, params);
    return rows;
  }
};

module.exports = ReportModel;