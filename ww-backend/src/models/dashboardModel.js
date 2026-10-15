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
  },

  // เพิ่มฟังก์ชันนี้ต่อท้ายภายใน DashboardModel
  getTopPerformers: async (branch_id) => {
    // กำหนดเงื่อนไขสาขา
    const branchCondition = branch_id ? `AND tsw.branch_id = $1` : '';
    const params = branch_id ? [branch_id] : [];

    // 1. ค้นหาอันดับ 1 แผนกเลื่อยไม้ (7 วันย้อนหลัง)
    const querySaw = `
        SELECT em.name AS emp_name, SUM(tsw.volumn) AS volumn, 'แผนกเลื่อยไม้' AS department
        FROM transaction_saw_woods tsw
        LEFT JOIN master_employees em ON em.old_id = tsw.sawer_id AND em.branch_id = tsw.branch_id
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE + INTERVAL '0 day'
          ${branchCondition}
        GROUP BY em.name
        ORDER BY SUM(tsw.volumn) DESC LIMIT 1
    `;

    // 2. ค้นหาอันดับ 1 แผนกจัดเรียงไม้เปียก (7 วันย้อนหลัง)
    const queryWet = `
        SELECT em.name AS emp_name, SUM(tsw.volumn) AS volumn, 'แผนกจัดเรียงไม้เปียก' AS department
        FROM transaction_wet_woods tsw
        LEFT JOIN master_employees em ON em.old_id = tsw.sorter_id AND em.branch_id = tsw.branch_id
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE + INTERVAL '0 day'
          ${branchCondition}
        GROUP BY em.name
        ORDER BY SUM(tsw.volumn) DESC LIMIT 1
    `;

    // 3. ค้นหาอันดับ 1 แผนกจัดเรียงไม้แห้ง (7 วันย้อนหลัง)
    const queryDry = `
        SELECT em.name AS emp_name, SUM(tsw.volumn) AS volumn, 'แผนกจัดเรียงไม้แห้ง' AS department
        FROM transaction_dry_woods tsw
        LEFT JOIN master_employees em ON em.old_id = tsw.sorter_id AND em.branch_id = tsw.branch_id
        WHERE tsw.produce_date >= CURRENT_DATE - INTERVAL '7 days'
          AND tsw.produce_date < CURRENT_DATE + INTERVAL '0 day'
          ${branchCondition}
        GROUP BY em.name
        ORDER BY SUM(tsw.volumn) DESC LIMIT 1
    `;

    // ยิง Query ทั้ง 3 แผนกพร้อมกันเพื่อความรวดเร็ว
    const [resSaw, resWet, resDry] = await Promise.all([
        pool.query(querySaw, params),
        pool.query(queryWet, params),
        pool.query(queryDry, params)
    ]);

    const combined = [];
    if (resSaw.rows.length > 0 && resSaw.rows[0].volumn > 0) combined.push(resSaw.rows[0]);
    if (resWet.rows.length > 0 && resWet.rows[0].volumn > 0) combined.push(resWet.rows[0]);
    if (resDry.rows.length > 0 && resDry.rows[0].volumn > 0) combined.push(resDry.rows[0]);

    // นำแชมป์ของทั้ง 3 แผนก มาเรียงลำดับจากปริมาตรมากที่สุด ไปหาน้อยที่สุด
    combined.sort((a, b) => Number(b.volumn) - Number(a.volumn));
    
    return combined;
  }
};

module.exports = DashboardModel;