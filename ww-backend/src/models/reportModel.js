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
  }
};

module.exports = ReportModel;