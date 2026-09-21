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

      const query = `
        WITH BaseData AS (
            SELECT 
                tsw.saw_name, mws.thick, mws.length, RIGHT(mws.wood_code, 7) AS wood_code,
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

      // 1. จัดกลุ่มข้อมูล และหายอดรวม
      const groupedData = rows.reduce((acc, row) => {
        const s = row.saw_name || 'ไม่ระบุชุดเลื่อย';
        const t = row.thick;
        const l = row.length;

        if (!acc[s]) acc[s] = { 
            saw_name: s, 
            thicks: {}, 
            // ยอดรวมทั้งชุดเลื่อย (เพื่อนำไปเป็นตัวหาร %ชุด)
            total_ab_volumn: 0, total_spc_volumn: 0
        };

        if (!acc[s].thicks[t]) {
          acc[s].thicks[t] = { 
            thick: t, 
            lengths: {}, 
            subTotal: { ab_volumn: 0, ab_amt: 0, spc_volumn: 0, spc_amt: 0 } 
          };
        }

        if (!acc[s].thicks[t].lengths[l]) {
          acc[s].thicks[t].lengths[l] = {
            length: l,
            items: [],
            subTotal: { ab_volumn: 0, ab_amt: 0, spc_volumn: 0, spc_amt: 0 }
          };
        }

        acc[s].thicks[t].lengths[l].items.push({
          wood_code: row.wood_code,
          ab_volumn: Number(row.ab_volumn), ab_pct_qty: Number(row.ab_percent_qty),
          ab_price: Number(row.ab_avg_price), ab_amt: Number(row.ab_amount),
          spc_volumn: Number(row.spc_volumn), spc_pct_qty: Number(row.spc_percent_qty),
          spc_price: Number(row.spc_avg_price), spc_amt: Number(row.spc_amount)
        });

        // บวกยอดเข้าความยาว
        acc[s].thicks[t].lengths[l].subTotal.ab_volumn += Number(row.ab_volumn);
        acc[s].thicks[t].lengths[l].subTotal.ab_amt += Number(row.ab_amount);
        acc[s].thicks[t].lengths[l].subTotal.spc_volumn += Number(row.spc_volumn);
        acc[s].thicks[t].lengths[l].subTotal.spc_amt += Number(row.spc_amount);

        // บวกยอดเข้าความหนา
        acc[s].thicks[t].subTotal.ab_volumn += Number(row.ab_volumn);
        acc[s].thicks[t].subTotal.ab_amt += Number(row.ab_amount);
        acc[s].thicks[t].subTotal.spc_volumn += Number(row.spc_volumn);
        acc[s].thicks[t].subTotal.spc_amt += Number(row.spc_amount);

        // บวกยอดเข้าชุดเลื่อยทั้งหมด
        acc[s].total_ab_volumn += Number(row.ab_volumn);
        acc[s].total_spc_volumn += Number(row.spc_volumn);

        return acc;
      }, {});

      // 2. คำนวณ % ต่างๆ ก่อนส่งให้ Frontend
      const finalData = Object.values(groupedData).map(sawGroup => {
        // ยอดรวมทั้งหมด (AB + พิเศษ) ของชุดเลื่อย
        sawGroup.total_all_volumn = sawGroup.total_ab_volumn + sawGroup.total_spc_volumn;

        sawGroup.thicks = Object.values(sawGroup.thicks).map(thickGroup => {
          // คำนวณแถว 1: % ความหนา (ชุด) รวมพิเศษ (หารด้วยยอดรวมทั้งชุด)
          thickGroup.pct_thick_all_ab = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_all_volumn) * 100 : 0;
          thickGroup.pct_thick_all_spc = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_all_volumn) * 100 : 0;

          // คำนวณแถว 2: % ความหนา (ชุด) แยก ปกติ ,พิเศษ (หารด้วยยอดรวมเฉพาะชนิดในชุด)
          thickGroup.pct_thick_sep_ab = sawGroup.total_ab_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_ab_volumn) * 100 : 0;
          thickGroup.pct_thick_sep_spc = sawGroup.total_spc_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_spc_volumn) * 100 : 0;

          // คำนวณแถว 3: ราคาเฉลี่ย ของความหนา
          thickGroup.avg_price_ab = thickGroup.subTotal.ab_volumn > 0 ? (thickGroup.subTotal.ab_amt / thickGroup.subTotal.ab_volumn) : 0;
          thickGroup.avg_price_spc = thickGroup.subTotal.spc_volumn > 0 ? (thickGroup.subTotal.spc_amt / thickGroup.subTotal.spc_volumn) : 0;

          thickGroup.lengths = Object.values(thickGroup.lengths).map(lenGroup => {
            lenGroup.subTotal.ab_pct_amt = thickGroup.subTotal.ab_volumn > 0 ? (lenGroup.subTotal.ab_volumn / thickGroup.subTotal.ab_volumn) * 100 : 0;
            lenGroup.subTotal.spc_pct_amt = thickGroup.subTotal.spc_volumn > 0 ? (lenGroup.subTotal.spc_volumn / thickGroup.subTotal.spc_volumn) * 100 : 0;
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