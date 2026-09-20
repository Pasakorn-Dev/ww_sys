const pool = require('../config/db');
const ReportModel = require('../models/reportModel');

const reportController = {
  getProductionCover: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code } = req.query;

      if (!branch_id || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'ระบุพารามิเตอร์ไม่ครบถ้วน' });
      }

      const rows = await ReportModel.getProductionCoverReport({ branch_id, start_date, end_date, store_code });

      // จัดกลุ่มข้อมูลตาม ประเภท (ปกติ/พิเศษ) และ เกรดไม้
      const groupedData = {};
      let branchName = '';
      
      rows.forEach(row => {
        if (!branchName) branchName = row.branch_name;
        
        const typeName = row.is_special ? 'พิเศษ' : 'ปกติ';
        const groupKey = `ไม้ ${row.grade || 'ไม่ระบุเกรด'} ${typeName}`;

        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            groupName: groupKey,
            items: [],
            sumAmount: 0,
            sumVolumn: 0
          };
        }

        groupedData[groupKey].items.push(row);
        groupedData[groupKey].sumAmount += Number(row.total_amount);
        groupedData[groupKey].sumVolumn += Number(row.total_volumn);
      });

      res.json({
        success: true,
        data: {
          header: {
            branch_name: branchName,
            start_date,
            end_date,
            store_code: store_code || 'รวมทุกสโตร์'
          },
          groups: Object.values(groupedData)
        }
      });
    } catch (error) {
      console.error('Report Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายงาน' });
    }
  },

  getAbWoodReport: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      // 1. นำ saw_name กลับเข้ามาใน SQL (GROUP BY และ PARTITION BY)
      const query = `
        WITH BaseData AS (
            SELECT 
                tsw.saw_name,
                mws.thick,
                mws.length,
                RIGHT(mws.wood_code, 7) AS wood_code,
                
                SUM(CASE WHEN mws.is_special = false THEN tsw.volumn ELSE 0 END) AS ab_volumn,
                SUM(CASE WHEN mws.is_special = false THEN tsw.net_price ELSE 0 END) AS ab_amount,
                
                SUM(CASE WHEN mws.is_special = true THEN tsw.volumn ELSE 0 END) AS spc_volumn,
                SUM(CASE WHEN mws.is_special = true THEN tsw.net_price ELSE 0 END) AS spc_amount
            FROM transaction_saw_woods tsw
            JOIN master_wood_sizes mws ON tsw.wood_size_id = mws.id 
            WHERE mws.grade = 'AB' 
              AND DATE(tsw.produce_date) BETWEEN $1 AND $2
            GROUP BY tsw.saw_name, mws.thick, mws.length, RIGHT(mws.wood_code, 7)
        )
        SELECT 
            saw_name, thick, length, wood_code,
            
            ab_volumn, ab_amount,
            CASE WHEN ab_volumn > 0 THEN ab_amount / ab_volumn ELSE 0 END AS ab_avg_price,
            CASE WHEN SUM(ab_volumn) OVER (PARTITION BY saw_name, thick, length) > 0 THEN (ab_volumn / SUM(ab_volumn) OVER (PARTITION BY saw_name, thick, length)) * 100 ELSE 0 END AS ab_percent_qty,
            
            spc_volumn, spc_amount,
            CASE WHEN spc_volumn > 0 THEN spc_amount / spc_volumn ELSE 0 END AS spc_avg_price,
            CASE WHEN SUM(spc_volumn) OVER (PARTITION BY saw_name, thick, length) > 0 THEN (spc_volumn / SUM(spc_volumn) OVER (PARTITION BY saw_name, thick, length)) * 100 ELSE 0 END AS spc_percent_qty
        FROM BaseData
        ORDER BY saw_name, thick, length, wood_code;
      `;

      const { rows } = await pool.query(query, [start_date, end_date]);

      // 2. จัดกลุ่มข้อมูลแบบ 3 ชั้น (ชุดเลื่อย -> ความหนา -> ความยาว)
      const groupedData = rows.reduce((acc, row) => {
        const s = row.saw_name || 'ไม่ระบุชุดเลื่อย';
        const t = row.thick;
        const l = row.length;

        // ชั้นที่ 1: ชุดเลื่อย
        if (!acc[s]) acc[s] = { saw_name: s, thicks: {} };

        // ชั้นที่ 2: ความหนา
        if (!acc[s].thicks[t]) {
          acc[s].thicks[t] = { 
            thick: t, 
            lengths: {}, 
            total_ab_volumn: 0, 
            total_spc_volumn: 0 
          };
        }

        // ชั้นที่ 3: ความยาว
        if (!acc[s].thicks[t].lengths[l]) {
          acc[s].thicks[t].lengths[l] = {
            length: l,
            items: [],
            subTotal: { ab_volumn: 0, ab_amt: 0, spc_volumn: 0, spc_amt: 0 }
          };
        }

        // รายการรหัสไม้ (Detail)
        acc[s].thicks[t].lengths[l].items.push({
          wood_code: row.wood_code,
          ab_volumn: Number(row.ab_volumn),
          ab_pct_qty: Number(row.ab_percent_qty),
          ab_price: Number(row.ab_avg_price),
          ab_amt: Number(row.ab_amount),
          spc_volumn: Number(row.spc_volumn),
          spc_pct_qty: Number(row.spc_percent_qty),
          spc_price: Number(row.spc_avg_price),
          spc_amt: Number(row.spc_amount)
        });

        // บวกยอดรวมของความยาว
        acc[s].thicks[t].lengths[l].subTotal.ab_volumn += Number(row.ab_volumn);
        acc[s].thicks[t].lengths[l].subTotal.ab_amt += Number(row.ab_amount);
        acc[s].thicks[t].lengths[l].subTotal.spc_volumn += Number(row.spc_volumn);
        acc[s].thicks[t].lengths[l].subTotal.spc_amt += Number(row.spc_amount);

        // บวกยอดรวมของความหนา (เพื่อเอาไปหา %ยาว)
        acc[s].thicks[t].total_ab_volumn += Number(row.ab_volumn);
        acc[s].thicks[t].total_spc_volumn += Number(row.spc_volumn);

        return acc;
      }, {});

      // 3. คำนวณ %ยาว และแปลง Object เป็น Array ส่งให้ React
      const finalData = Object.values(groupedData).map(sawGroup => {
        sawGroup.thicks = Object.values(sawGroup.thicks).map(thickGroup => {
          thickGroup.lengths = Object.values(thickGroup.lengths).map(lenGroup => {
            // คำนวณ %ยาว (สัดส่วนของแต่ละความยาวเทียบกับความหนาทั้งหมดในชุดเลื่อยนั้น)
            lenGroup.subTotal.ab_pct_amt = thickGroup.total_ab_volumn > 0 
              ? (lenGroup.subTotal.ab_volumn / thickGroup.total_ab_volumn) * 100 : 0;
            
            lenGroup.subTotal.spc_pct_amt = thickGroup.total_spc_volumn > 0 
              ? (lenGroup.subTotal.spc_volumn / thickGroup.total_spc_volumn) * 100 : 0;
            
            return lenGroup;
          });
          return thickGroup;
        });
        return sawGroup;
      });

      res.status(200).json({ success: true, data: finalData });

    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = reportController;