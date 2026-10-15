const pool = require('../config/db');

const DashboardModel = {
  getOverviewData: async (branch_id) => {
    // กำหนดเงื่อนไขสาขา ถ้ามี branch_id ส่งมา ให้กรองเฉพาะสาขานั้น
    const branchCondition = branch_id ? `AND tsw.branch_id = $1` : '';
    const params = branch_id ? [branch_id] : [];

    // Query ดึงข้อมูล 7 วันย้อนหลัง 
    const query = `
      WITH BaseData AS (
        SELECT tsw.produce_date, SUM(tsw.volumn) AS volumn, SUM(tsw.net_price) AS net_money, 'wood_saw' as wood_type
        FROM transaction_saw_woods tsw
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE
          ${branchCondition}
        GROUP BY tsw.produce_date
        
        UNION ALL
        
        SELECT tsw.produce_date, SUM(tsw.volumn) AS volumn, SUM(tsw.net_wage) AS net_money, 'wood_wet' as wood_type
        FROM transaction_wet_woods tsw
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE
          ${branchCondition}
        GROUP BY tsw.produce_date
        
        UNION ALL
        
        SELECT tsw.produce_date, SUM(tsw.volumn) AS volumn, SUM(tsw.net_wage) AS net_money, 'wood_dry' as wood_type
        FROM transaction_dry_woods tsw
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE
          ${branchCondition}
        GROUP BY tsw.produce_date
      ) 
      SELECT 
        produce_date
        ,SUM(CASE WHEN wood_type = 'wood_saw' THEN volumn ELSE 0 END) AS volumn_saw
        ,SUM(CASE WHEN wood_type = 'wood_saw' THEN net_money ELSE 0 END) AS net_money_saw
        ,SUM(CASE WHEN wood_type = 'wood_wet' THEN volumn ELSE 0 END) AS volumn_wet
        ,SUM(CASE WHEN wood_type = 'wood_wet' THEN net_money ELSE 0 END) AS net_money_wet
        ,SUM(CASE WHEN wood_type = 'wood_dry' THEN volumn ELSE 0 END) AS volumn_dry
        ,SUM(CASE WHEN wood_type = 'wood_dry' THEN net_money ELSE 0 END) AS net_money_dry
      FROM BaseData
      GROUP BY produce_date
      ORDER BY produce_date DESC
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }
};

module.exports = DashboardModel;