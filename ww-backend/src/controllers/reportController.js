const pool = require('../config/db');
const ReportModel = require('../models/reportModel');
const puppeteer = require('puppeteer'); // หรือใช้ library ทำ PDF ที่ระบบคุณมีอยู่แล้ว
const ExcelJS = require('exceljs'); // <- ต้องมีบรรทัดนี้
const fs = require('fs');      
const path = require('path');  

const fetchWoodTypeAbData = async (start_date, end_date, branch_id) => {
  const query = `
    WITH BaseData AS (
        SELECT 
            tsw.saw_name, mws.thick, mws.length, RIGHT(mws.wood_code, 7) AS wood_code,
            SUM(CASE WHEN mws.is_special = false THEN tsw.volumn ELSE 0 END) AS ab_volumn,
            SUM(CASE WHEN mws.is_special = false THEN tsw.net_price ELSE 0 END) AS ab_amount,
            SUM(CASE WHEN mws.is_special = true THEN tsw.volumn ELSE 0 END) AS spc_volumn,
            SUM(CASE WHEN mws.is_special = true THEN tsw.net_price ELSE 0 END) AS spc_amount
        FROM transaction_saw_woods tsw
        JOIN master_wood_sizes mws 
          on mws.old_id = tsw.wood_size_id 
          and tsw.branch_id = mws.branch_id
        WHERE mws.grade = 'AB' 
          AND DATE(tsw.produce_date) BETWEEN $1 AND $2
          AND tsw.branch_id = $3
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

  const { rows } = await pool.query(query, [start_date, end_date, branch_id]);

  // --- 1. คำนวณยอดรวมทั้งหมดทั้งรายงาน (Grand Total) ---
  let gt_ab_volumn = 0, gt_ab_amount = 0, gt_spc_volumn = 0, gt_spc_amount = 0;
  
  rows.forEach(row => {
    gt_ab_volumn += Number(row.ab_volumn || 0);
    gt_ab_amount += Number(row.ab_amount || 0);
    gt_spc_volumn += Number(row.spc_volumn || 0);
    gt_spc_amount += Number(row.spc_amount || 0);
  });

  const gt_all_volumn = gt_ab_volumn + gt_spc_volumn;

  const grandTotal = {
    ab_volumn: gt_ab_volumn,
    ab_amt: gt_ab_amount,
    spc_volumn: gt_spc_volumn,
    spc_amt: gt_spc_amount,
    
    // % ความหนา รวมพิเศษ (เทียบปริมาตรรวมทั้งรายงาน)
    pct_all_ab: gt_all_volumn > 0 ? (gt_ab_volumn / gt_all_volumn) * 100 : 0,
    pct_all_spc: gt_all_volumn > 0 ? (gt_spc_volumn / gt_all_volumn) * 100 : 0,

    // % ความหนา แยกปกติ,พิเศษ (จะเต็ม 100% เสมอเพราะเทียบกับตัวเอง)
    pct_sep_ab: gt_ab_volumn > 0 ? 100 : 0, 
    pct_sep_spc: gt_spc_volumn > 0 ? 100 : 0,

    // ราคาเฉลี่ยรวมทั้งรายงาน
    avg_price_ab: gt_ab_volumn > 0 ? (gt_ab_amount / gt_ab_volumn) : 0,
    avg_price_spc: gt_spc_volumn > 0 ? (gt_spc_amount / gt_spc_volumn) : 0,
  };

  // --- 2. จัดกลุ่มข้อมูล (Grouping) ---
  const groupedData = rows.reduce((acc, row) => {
    const s = row.saw_name || 'ไม่ระบุชุดเลื่อย';
    const t = row.thick;
    const l = row.length;

    if (!acc[s]) acc[s] = { saw_name: s, thicks: {}, total_ab_volumn: 0, total_spc_volumn: 0 };
    if (!acc[s].thicks[t]) acc[s].thicks[t] = { thick: t, lengths: {}, subTotal: { ab_volumn: 0, ab_amt: 0, spc_volumn: 0, spc_amt: 0 } };
    if (!acc[s].thicks[t].lengths[l]) acc[s].thicks[t].lengths[l] = { length: l, items: [], subTotal: { ab_volumn: 0, ab_amt: 0, spc_volumn: 0, spc_amt: 0 } };

    acc[s].thicks[t].lengths[l].items.push({
      wood_code: row.wood_code,
      ab_volumn: Number(row.ab_volumn), ab_pct_qty: Number(row.ab_percent_qty),
      ab_price: Number(row.ab_avg_price), ab_amt: Number(row.ab_amount),
      spc_volumn: Number(row.spc_volumn), spc_pct_qty: Number(row.spc_percent_qty),
      spc_price: Number(row.spc_avg_price), spc_amt: Number(row.spc_amount)
    });

    acc[s].thicks[t].lengths[l].subTotal.ab_volumn += Number(row.ab_volumn);
    acc[s].thicks[t].lengths[l].subTotal.ab_amt += Number(row.ab_amount);
    acc[s].thicks[t].lengths[l].subTotal.spc_volumn += Number(row.spc_volumn);
    acc[s].thicks[t].lengths[l].subTotal.spc_amt += Number(row.spc_amount);

    acc[s].thicks[t].subTotal.ab_volumn += Number(row.ab_volumn);
    acc[s].thicks[t].subTotal.ab_amt += Number(row.ab_amount);
    acc[s].thicks[t].subTotal.spc_volumn += Number(row.spc_volumn);
    acc[s].thicks[t].subTotal.spc_amt += Number(row.spc_amount);

    acc[s].total_ab_volumn += Number(row.ab_volumn);
    acc[s].total_spc_volumn += Number(row.spc_volumn);

    return acc;
  }, {});

  const finalData = Object.values(groupedData).map(sawGroup => {
    sawGroup.total_all_volumn = sawGroup.total_ab_volumn + sawGroup.total_spc_volumn;
    sawGroup.thicks = Object.values(sawGroup.thicks).map(thickGroup => {
      thickGroup.pct_thick_all_ab = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_all_volumn) * 100 : 0;
      thickGroup.pct_thick_all_spc = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_all_volumn) * 100 : 0;
      thickGroup.pct_thick_sep_ab = sawGroup.total_ab_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_ab_volumn) * 100 : 0;
      thickGroup.pct_thick_sep_spc = sawGroup.total_spc_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_spc_volumn) * 100 : 0;
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

  // ส่งกลับทั้งข้อมูลตารางและผลรวม
  return { finalData, grandTotal };
};

// --- Helper Function สำหรับดึงข้อมูลและคำนวณ (ลดความซ้ำซ้อน) ---
const fetchProductionThickMilData = async (start_date, end_date, branch_id, store_code) => {
  const rows = await ReportModel.getProductionThickMilReport({ branch_id, start_date, end_date, store_code });

  let grand_total_volumn = 0;
  let grand_total_amount = 0;
  const lengthSummaryMap = {};

  rows.forEach(row => {
    const vol = Number(row.ab_volumn) || 0;
    const amt = Number(row.ab_amount) || 0;
    const len = row.length;
    
    grand_total_volumn += vol;
    grand_total_amount += amt;

    if (!lengthSummaryMap[len]) lengthSummaryMap[len] = 0;
    lengthSummaryMap[len] += vol;
  });

  const grouped = rows.reduce((acc, row) => {
    const tm = row.thick_mil;
    const l = row.length;
    const vol = Number(row.ab_volumn) || 0;
    const amt = Number(row.ab_amount) || 0;

    if (!acc[tm]) {
      acc[tm] = { thick_mil: tm, thick: row.thick, lengths: {}, total_volumn: 0, total_amount: 0 };
    }
    if (!acc[tm].lengths[l]) {
      acc[tm].lengths[l] = { length: l, items: [], sub_volumn: 0, sub_amount: 0 };
    }

    acc[tm].lengths[l].items.push({
      wood_code: row.wood_code,
      ab_volumn: vol,
      ab_amount: amt,
      avg_price: vol > 0 ? amt / vol : 0
    });

    acc[tm].lengths[l].sub_volumn += vol;
    acc[tm].lengths[l].sub_amount += amt;
    acc[tm].total_volumn += vol;
    acc[tm].total_amount += amt;

    return acc;
  }, {});

  const formattedData = Object.values(grouped).map(tmGroup => {
    const lengthsArr = Object.values(tmGroup.lengths).map(lenGroup => {
      lenGroup.items = lenGroup.items.map(item => {
          item.pct_width = lenGroup.sub_volumn > 0 ? (item.ab_volumn / lenGroup.sub_volumn) * 100 : 0;
          return item;
      });
      lenGroup.pct_length = tmGroup.total_volumn > 0 ? (lenGroup.sub_volumn / tmGroup.total_volumn) * 100 : 0;
      return lenGroup;
    });

    return {
      thick_mil: tmGroup.thick_mil,
      thick: tmGroup.thick,
      lengths: lengthsArr,
      total_volumn: tmGroup.total_volumn,
      total_amount: tmGroup.total_amount,
      pct_thick_total: grand_total_volumn > 0 ? (tmGroup.total_volumn / grand_total_volumn) * 100 : 0,
      avg_price: tmGroup.total_volumn > 0 ? tmGroup.total_amount / tmGroup.total_volumn : 0
    };
  });

  const lengthSummary = Object.keys(lengthSummaryMap).sort((a,b) => Number(a) - Number(b)).map(len => {
      const vol = lengthSummaryMap[len];
      return {
        length: len,
        volumn: vol,
        pct: grand_total_volumn > 0 ? (vol / grand_total_volumn) * 100 : 0
      };
  });

  const grandTotal = {
    total_volumn: grand_total_volumn,
    total_amount: grand_total_amount,
    avg_price: grand_total_volumn > 0 ? grand_total_amount / grand_total_volumn : 0
  };

  return { formattedData, grandTotal, lengthSummary };
};

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
  // 💡 เพิ่มฟังก์ชันรูปแบบที่ 2 (จัดกลุ่มตามชุดเลื่อย)
  getProductionCoverFormat2: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code } = req.query;

      if (!branch_id || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'ระบุพารามิเตอร์ไม่ครบถ้วน' });
      }

      // เรียกใช้ Model ตัวใหม่
      const rows = await ReportModel.getProductionCoverReportFormat2({ branch_id, start_date, end_date, store_code });

      const groupedData = {};
      let branchName = '';
      
      rows.forEach(row => {
        if (!branchName) branchName = row.branch_name;
        
        const typeName = row.is_special ? 'พิเศษ' : 'ปกติ';
        const sawName = row.saw_name || 'ไม่ระบุชุดเลื่อย';
        
        // จัดกลุ่มโดยเอา "ชุดเลื่อย" ขึ้นต้น ตามด้วยชนิดไม้
        const groupKey = `ชุดเลื่อย: ${sawName} (ไม้ ${row.grade || 'ไม่ระบุเกรด'} ${typeName})`;

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
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายงานรูปแบบที่ 2' });
    }
  },
  /*
  getAbWoodReport: async (req, res) => {
    try {
      // 1. รับค่า branch_id เพิ่มเติมจาก req.query[cite: 6]
      const { start_date, end_date, branch_id } = req.query;

      // 2. ตรวจสอบพารามิเตอร์ให้ครบถ้วนก่อนดึงข้อมูล[cite: 6]
      if (!branch_id || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'ระบุพารามิเตอร์ไม่ครบถ้วน' });
      }

      // 3. เพิ่มเงื่อนไข AND tsw.branch_id = $3 ลงใน WHERE clause[cite: 6]
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
              AND tsw.branch_id = $3
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

      // 4. ส่งค่า branch_id เป็นพารามิเตอร์ตัวที่ 3 ใน Array[cite: 6]
      const { rows } = await pool.query(query, [start_date, end_date, branch_id]);

      // จัดกลุ่มข้อมูล และหายอดรวม
      const groupedData = rows.reduce((acc, row) => {
        const s = row.saw_name || 'ไม่ระบุชุดเลื่อย';
        const t = row.thick;
        const l = row.length;

        if (!acc[s]) acc[s] = { 
            saw_name: s, 
            thicks: {}, 
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

      // คำนวณ % ต่างๆ ก่อนส่งให้ Frontend
      const finalData = Object.values(groupedData).map(sawGroup => {
        sawGroup.total_all_volumn = sawGroup.total_ab_volumn + sawGroup.total_spc_volumn;

        sawGroup.thicks = Object.values(sawGroup.thicks).map(thickGroup => {
          thickGroup.pct_thick_all_ab = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_all_volumn) * 100 : 0;
          thickGroup.pct_thick_all_spc = sawGroup.total_all_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_all_volumn) * 100 : 0;

          thickGroup.pct_thick_sep_ab = sawGroup.total_ab_volumn > 0 ? (thickGroup.subTotal.ab_volumn / sawGroup.total_ab_volumn) * 100 : 0;
          thickGroup.pct_thick_sep_spc = sawGroup.total_spc_volumn > 0 ? (thickGroup.subTotal.spc_volumn / sawGroup.total_spc_volumn) * 100 : 0;

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
  },
  */
  // ฟังก์ชัน API เดิมของ JSON 
  getAbWoodReport: async (req, res) => {
    try {
      const { start_date, end_date, branch_id } = req.query;
      if (!branch_id || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing parameters' });
      
      // รับค่าทั้ง data และ grandTotal
      const result = await fetchWoodTypeAbData(start_date, end_date, branch_id);
      
      // แนบ grandTotal ไปใน JSON Response ด้วย
      res.status(200).json({ 
        success: true, 
        data: result.finalData, 
        grandTotal: result.grandTotal 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },
  
  // --- 2. ฟังก์ชัน สร้างไฟล์ Excel (Blob) ---
  exportAbWoodReportExcel: async (req, res) => {
    try {
      const { start_date, end_date, branch_id } = req.query;
      
      // 💡 แก้ไข: รับค่า finalData มาใส่ในตัวแปร data และรับ grandTotal มาด้วย
      const { finalData: data, grandTotal } = await fetchWoodTypeAbData(start_date, end_date, branch_id);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Wood Type Report');

      // กำหนดคอลัมน์ Excel
      worksheet.columns = [
        { header: 'ขนาดไม้', key: 'code1', width: 10 },
        { header: '', key: 'code2', width: 15 },
        { header: 'AB', key: 'ab_vol', width: 12 },
        { header: '% กว้าง', key: 'ab_pct_w', width: 10 },
        { header: '% ยาว', key: 'ab_pct_l', width: 10 },
        { header: 'ราคาเฉลี่ย', key: 'ab_price', width: 12 },
        { header: 'จำนวนเงิน', key: 'ab_amt', width: 15 },
        { header: 'AB พิเศษ', key: 'spc_vol', width: 12 },
        { header: '% กว้าง', key: 'spc_pct_w', width: 10 },
        { header: '% ยาว', key: 'spc_pct_l', width: 10 },
        { header: 'ราคาเฉลี่ย', key: 'spc_price', width: 12 },
        { header: 'จำนวนเงิน', key: 'spc_amt', width: 15 }
      ];

      // จัดรูปแบบหัวตาราง
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9FC5E8' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      // วนลูปวาดข้อมูลทีละบรรทัด 
      data.forEach((saw, sIdx) => {
        const sawRow = worksheet.addRow([saw.saw_name, `ชุดที่ ${sIdx + 1}`]);
        sawRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        sawRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        
        saw.thicks.forEach(thick => {
          const thickRow = worksheet.addRow(['ความหนา', thick.thick]);
          thickRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
          thickRow.font = { bold: true, color: { argb: 'FF000099' } };

          thick.lengths.forEach(len => {
            len.items.forEach(item => {
               worksheet.addRow([
                 item.wood_code.substring(0, 2), item.wood_code.substring(2),
                 Number(item.ab_volumn).toFixed(4), item.ab_pct_qty + '%', '', item.ab_price > 0 ? Number(item.ab_price).toFixed(2) : '', Number(item.ab_amt).toFixed(2),
                 Number(item.spc_volumn).toFixed(4), item.spc_volumn > 0 ? item.spc_pct_qty + '%' : '', '', item.spc_price > 0 ? Number(item.spc_price).toFixed(2) : '', Number(item.spc_amt).toFixed(2)
               ]);
            });
            // บรรทัด รวมยาว
            const lenRow = worksheet.addRow([`รวมยาว ${len.length}`, '', Number(len.subTotal.ab_volumn).toFixed(4), '100.00%', len.subTotal.ab_pct_amt.toFixed(2) + '%', '', Number(len.subTotal.ab_amt).toFixed(2), Number(len.subTotal.spc_volumn).toFixed(4), len.subTotal.spc_volumn > 0 ? '100.00%' : '', len.subTotal.spc_volumn > 0 ? len.subTotal.spc_pct_amt.toFixed(2) + '%' : '', '', Number(len.subTotal.spc_amt).toFixed(2)]);
            lenRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
            lenRow.font = { bold: true };
          });

          // บรรทัด รวมหนา
          const thickSubRow = worksheet.addRow(['รวมหนา', thick.thick, Number(thick.subTotal.ab_volumn).toFixed(4), '', '100.00%', '', Number(thick.subTotal.ab_amt).toFixed(2), Number(thick.subTotal.spc_volumn).toFixed(4), '', thick.subTotal.spc_volumn > 0 ? '100.00%' : '', '', Number(thick.subTotal.spc_amt).toFixed(2)]);
          thickSubRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
          thickSubRow.font = { bold: true };
        });
      });

      // 💡 วาดบรรทัดสรุปรวมทั้งหมด (Grand Total) ลงใน Excel
      if (grandTotal) {
        worksheet.addRow([]); // บรรทัดว่างคั่น
        
        const gtRow1 = worksheet.addRow(['รวมทั้งหมดทั้งรายงาน', '', Number(grandTotal.ab_volumn).toFixed(4), '', '100.00%', '', Number(grandTotal.ab_amt).toFixed(2), Number(grandTotal.spc_volumn).toFixed(4), '', grandTotal.spc_volumn > 0 ? '100.00%' : '', '', Number(grandTotal.spc_amt).toFixed(2)]);
        gtRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } };
        gtRow1.font = { bold: true };

        const gtRow2 = worksheet.addRow(['% รวมทั้งหมด รวมพิเศษ', '', '', grandTotal.ab_volumn > 0 ? grandTotal.pct_all_ab.toFixed(2) + '%' : '', '', '', '', '', '', grandTotal.spc_volumn > 0 ? grandTotal.pct_all_spc.toFixed(2) + '%' : '', '', '']);
        gtRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } }; 
        gtRow2.font = { bold: true, color: { argb: 'FF804000' } };

        const gtRow3 = worksheet.addRow(['% รวมทั้งหมด แยก ปกติ ,พิเศษ', '', '', grandTotal.ab_volumn > 0 ? grandTotal.pct_sep_ab.toFixed(2) + '%' : '', '', '', '', '', '', grandTotal.spc_volumn > 0 ? grandTotal.pct_sep_spc.toFixed(2) + '%' : '', '', '']);
        gtRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } };
        gtRow3.font = { bold: true, color: { argb: 'FF804000' } };

        const gtRow4 = worksheet.addRow(['ราคาเฉลี่ยรวมทั้งหมด', '', '', grandTotal.ab_volumn > 0 ? grandTotal.avg_price_ab.toFixed(2) : '', '', '', '', '', '', grandTotal.spc_volumn > 0 ? grandTotal.avg_price_spc.toFixed(2) : '', '', '']);
        gtRow4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; 
        gtRow4.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
      }

      // ส่งกลับเป็นไฟล์ Binary (Blob)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error generating Excel' });
    }
  },

  // --- 3. ฟังก์ชัน สร้างไฟล์ PDF (Blob) ---
  exportAbWoodReportPDF: async (req, res) => {
    try {
      const { start_date, end_date, branch_id } = req.query;
      
      // 💡 แก้ไข: รับค่า finalData และ grandTotal
      const { finalData: data, grandTotal } = await fetchWoodTypeAbData(start_date, end_date, branch_id);

      const fontPath = path.join(__dirname, '../assets/fonts/THSarabunNew.ttf');
      let fontBase64 = '';
      if (fs.existsSync(fontPath)) {
        fontBase64 = fs.readFileSync(fontPath).toString('base64');
      } else {
        console.warn('⚠️ ไม่พบไฟล์ฟอนต์ที่:', fontPath);
      }

      let tableRows = '';
      data.forEach((saw, sIdx) => {
        tableRows += `<tr class="saw"><td colspan="2" class="left pl">${saw.saw_name}</td><td colspan="10" class="left pl">ชุดที่ ${sIdx + 1}</td></tr>`;

        saw.thicks.forEach(thick => {
          tableRows += `<tr class="thick"><td class="left pl text-blue">ความหนา</td><td colspan="11" class="left pl text-blue">${thick.thick}</td></tr>`;

          thick.lengths.forEach(len => {
            len.items.forEach(item => {
              tableRows += `
                <tr>
                  <td colspan="2" class="left pl"><span class="text-red bold">${item.wood_code.substring(0, 2)}</span>${item.wood_code.substring(2)}</td>
                  <td>${Number(item.ab_volumn).toFixed(4)}</td>
                  <td>${Number(item.ab_pct_qty).toFixed(2)}%</td>
                  <td class="bg-gray"></td>
                  <td>${item.ab_price > 0 ? Number(item.ab_price).toFixed(2) : ''}</td>
                  <td>${Number(item.ab_amt).toFixed(2)}</td>
                  <td>${Number(item.spc_volumn).toFixed(4)}</td>
                  <td>${item.spc_volumn > 0 ? Number(item.spc_pct_qty).toFixed(2) + '%' : ''}</td>
                  <td class="bg-gray"></td>
                  <td>${item.spc_price > 0 ? Number(item.spc_price).toFixed(2) : ''}</td>
                  <td>${Number(item.spc_amt).toFixed(2)}</td>
                </tr>
              `;
            });

            tableRows += `
              <tr class="sum-len">
                <td colspan="2" class="left pl">รวมยาว ${len.length}</td>
                <td>${len.subTotal.ab_volumn.toFixed(4)}</td>
                <td>${len.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
                <td class="text-blue">${len.subTotal.ab_volumn > 0 ? len.subTotal.ab_pct_amt.toFixed(2) + '%' : ''}</td>
                <td class="bg-gray"></td>
                <td>${len.subTotal.ab_amt.toFixed(2)}</td>
                <td>${len.subTotal.spc_volumn.toFixed(4)}</td>
                <td>${len.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
                <td class="text-blue">${len.subTotal.spc_volumn > 0 ? len.subTotal.spc_pct_amt.toFixed(2) + '%' : ''}</td>
                <td class="bg-gray"></td>
                <td>${len.subTotal.spc_amt.toFixed(2)}</td>
              </tr>
            `;
          });

          tableRows += `
            <tr class="sum-thick">
              <td colspan="2" class="left pl">รวมหนา <span class="text-red">${thick.thick}</span></td>
              <td class="text-green">${thick.subTotal.ab_volumn.toFixed(4)}</td>
              <td class="bg-gray"></td>
              <td>${thick.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
              <td class="bg-gray"></td>
              <td class="text-green">${thick.subTotal.ab_amt.toFixed(2)}</td>
              <td class="text-green">${thick.subTotal.spc_volumn.toFixed(4)}</td>
              <td class="bg-gray"></td>
              <td>${thick.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
              <td class="bg-gray"></td>
              <td class="text-green">${thick.subTotal.spc_amt.toFixed(2)}</td>
            </tr>
          `;

          tableRows += `
            <tr>
              <td colspan="2" class="left pl">% ความหนา (ชุด) รวมพิเศษ</td>
              <td class="bg-gray"></td>
              <td class="bg-yellow">${thick.subTotal.ab_volumn > 0 ? thick.pct_thick_all_ab.toFixed(2) + '%' : ''}</td>
              <td class="bg-gray" colspan="4"></td>
              <td class="bg-yellow">${thick.subTotal.spc_volumn > 0 ? thick.pct_thick_all_spc.toFixed(2) + '%' : ''}</td>
              <td class="bg-gray" colspan="3"></td>
            </tr>
            <tr>
              <td colspan="2" class="left pl">% ความหนา (ชุด) แยก ปกติ ,พิเศษ</td>
              <td class="bg-gray"></td>
              <td class="bg-orange">${thick.subTotal.ab_volumn > 0 ? thick.pct_thick_sep_ab.toFixed(2) + '%' : ''}</td>
              <td class="bg-gray" colspan="4"></td>
              <td class="bg-orange">${thick.subTotal.spc_volumn > 0 ? thick.pct_thick_sep_spc.toFixed(2) + '%' : ''}</td>
              <td class="bg-gray" colspan="3"></td>
            </tr>
            <tr>
              <td colspan="2" class="left pl border-bottom">ราคาเฉลี่ย</td>
              <td class="bg-gray"></td>
              <td class="bg-red">${thick.subTotal.ab_volumn > 0 ? thick.avg_price_ab.toFixed(2) : ''}</td>
              <td class="bg-gray" colspan="4"></td>
              <td class="bg-red">${thick.subTotal.spc_volumn > 0 ? thick.avg_price_spc.toFixed(2) : ''}</td>
              <td class="bg-gray" colspan="3"></td>
            </tr>
          `;
        });
      });

      // 💡 วาดบรรทัดสรุปรวมทั้งหมด (Grand Total) ลงใน PDF
      if (grandTotal) {
        tableRows += `
          <tr style="background-color: #a9d08e; font-weight: bold; border-top: 2px solid #555;">
            <td colspan="2" class="left pl">รวมทั้งหมดทั้งรายงาน</td>
            <td style="color: #000;">${grandTotal.ab_volumn.toFixed(4)}</td>
            <td class="bg-gray"></td>
            <td style="color: #444;">${grandTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
            <td class="bg-gray"></td>
            <td style="color: #000;">${grandTotal.ab_amt.toFixed(2)}</td>
            <td style="color: #000;">${grandTotal.spc_volumn.toFixed(4)}</td>
            <td class="bg-gray"></td>
            <td style="color: #444;">${grandTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
            <td class="bg-gray"></td>
            <td style="color: #000;">${grandTotal.spc_amt.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" class="left pl">% รวมทั้งหมด รวมพิเศษ</td>
            <td class="bg-gray"></td>
            <td class="bg-yellow">${grandTotal.ab_volumn > 0 ? grandTotal.pct_all_ab.toFixed(2) + '%' : ''}</td>
            <td class="bg-gray" colspan="4"></td>
            <td class="bg-yellow">${grandTotal.spc_volumn > 0 ? grandTotal.pct_all_spc.toFixed(2) + '%' : ''}</td>
            <td class="bg-gray" colspan="3"></td>
          </tr>
          <tr>
            <td colspan="2" class="left pl">% รวมทั้งหมด แยก ปกติ ,พิเศษ</td>
            <td class="bg-gray"></td>
            <td class="bg-orange">${grandTotal.ab_volumn > 0 ? grandTotal.pct_sep_ab.toFixed(2) + '%' : ''}</td>
            <td class="bg-gray" colspan="4"></td>
            <td class="bg-orange">${grandTotal.spc_volumn > 0 ? grandTotal.pct_sep_spc.toFixed(2) + '%' : ''}</td>
            <td class="bg-gray" colspan="3"></td>
          </tr>
          <tr>
            <td colspan="2" class="left pl border-bottom">ราคาเฉลี่ยรวมทั้งหมด</td>
            <td class="bg-gray"></td>
            <td class="bg-red">${grandTotal.ab_volumn > 0 ? grandTotal.avg_price_ab.toFixed(2) : ''}</td>
            <td class="bg-gray" colspan="4"></td>
            <td class="bg-red">${grandTotal.spc_volumn > 0 ? grandTotal.avg_price_spc.toFixed(2) : ''}</td>
            <td class="bg-gray" colspan="3"></td>
          </tr>
        `;
      }

      const htmlContent = `
        <html>
          <head>
            <style>
              @font-face {
                font-family: 'THSarabun';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              body { font-family: 'THSarabun', sans-serif; font-size: 13px; margin: 0; padding: 20px; }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid #777; padding: 4px; text-align: right; }
              th { background-color: #9fc5e8; font-weight: bold; text-align: center; }
              .center { text-align: center; }
              .left { text-align: left; }
              .pl { padding-left: 10px; }
              .bold { font-weight: bold; }
              .saw { background-color: #4472c4; color: white; font-weight: bold; }
              .thick { background-color: #e6f2ff; font-weight: bold; }
              .sum-len { background-color: #fff2cc; font-weight: bold; }
              .sum-thick { background-color: #c6e0b4; font-weight: bold; border-top: 2px solid #555; }
              .text-blue { color: #000099; }
              .text-red { color: #cc0000; }
              .text-green { color: #006600; }
              .bg-gray { background-color: #f2f2f2; }
              .bg-yellow { background-color: #ffe699; font-weight: bold; color: #804000; }
              .bg-orange { background-color: #f8cbad; font-weight: bold; color: #804000; }
              .bg-red { background-color: #ff0000; font-weight: bold; color: white; }
              .border-bottom { border-bottom: 2px solid #555; }
              .title-box { text-align: center; margin-bottom: 15px; }
              h1 { font-size: 20px; margin: 0 0 5px 0; font-weight: bold; }
              h2 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; }
              p { margin: 0; font-size: 14px; color: #444; }
            </style>
          </head>
          <body>
            <div class="title-box">
              <h1>บริษัท วู้ดเวิร์ค จำกัด</h1>
              <h2>รายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
              <p>ตั้งแต่วันที่ ${start_date} ถึงวันที่ ${end_date}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th colspan="2">ขนาดไม้</th>
                  <th>AB</th><th>% กว้าง</th><th>% ยาว</th><th>ราคาเฉลี่ย</th><th>จำนวนเงิน</th>
                  <th>AB พิเศษ</th><th>% กว้าง</th><th>% ยาว</th><th>ราคาเฉลี่ย</th><th>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        landscape: true, 
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="report.pdf"');
      res.send(pdfBuffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
  },

  // เพิ่มเข้าไปใน reportController
  getAveragePriceReport: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code } = req.query;

      if (!branch_id || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'ระบุพารามิเตอร์ไม่ครบถ้วน' });
      }

      // เรียกข้อมูลจาก Model
      const rows = await ReportModel.getAveragePriceReport({ branch_id, start_date, end_date, store_code });

      // คำนวณ Grand Total แบบดิบ (ยอดเงินรวม / ปริมาตรรวม ของทั้งบริษัท) เพื่อความแม่นยำ
      let gt = {
        price_normal_ab: 0, vol_normal_ab: 0,
        price_special_ab: 0, vol_special_ab: 0,
        price_ab: 0, vol_ab: 0,
        
        price_normal_c: 0, vol_normal_c: 0,
        price_special_c: 0, vol_special_c: 0,
        price_c: 0, vol_c: 0,
        
        price_normal_p: 0, vol_normal_p: 0,
        price_special_p: 0, vol_special_p: 0,
        price_p: 0, vol_p: 0,
        
        price_normal_pp: 0, vol_normal_pp: 0,
        price_special_pp: 0, vol_special_pp: 0,
        price_pp: 0, vol_pp: 0,

        total_price: 0, total_volumn: 0
      };

      rows.forEach(row => {
        gt.price_normal_ab += Number(row.price_normal_ab || 0);
        gt.vol_normal_ab += Number(row.vol_normal_ab || 0);
        gt.price_special_ab += Number(row.price_special_ab || 0);
        gt.vol_special_ab += Number(row.vol_special_ab || 0);
        gt.price_ab += Number(row.price_ab || 0);
        gt.vol_ab += Number(row.vol_ab || 0);

        gt.price_normal_c += Number(row.price_normal_c || 0);
        gt.vol_normal_c += Number(row.vol_normal_c || 0);
        gt.price_special_c += Number(row.price_special_c || 0);
        gt.vol_special_c += Number(row.vol_special_c || 0);
        gt.price_c += Number(row.price_c || 0);
        gt.vol_c += Number(row.vol_c || 0);

        gt.price_normal_p += Number(row.price_normal_p || 0);
        gt.vol_normal_p += Number(row.vol_normal_p || 0);
        gt.price_special_p += Number(row.price_special_p || 0);
        gt.vol_special_p += Number(row.vol_special_p || 0);
        gt.price_p += Number(row.price_p || 0);
        gt.vol_p += Number(row.vol_p || 0);

        gt.price_normal_pp += Number(row.price_normal_pp || 0);
        gt.vol_normal_pp += Number(row.vol_normal_pp || 0);
        gt.price_special_pp += Number(row.price_special_pp || 0);
        gt.vol_special_pp += Number(row.vol_special_pp || 0);
        gt.price_pp += Number(row.price_pp || 0);
        gt.vol_pp += Number(row.vol_pp || 0);

        gt.total_price += Number(row.total_price || 0);
        gt.total_volumn += Number(row.total_volumn || 0);
      });

      // นำผลรวมที่ได้มาหารกันเพื่อให้ได้ราคาเฉลี่ยรวมที่ถูกต้อง
      const grandTotal = {
        normal_ab: gt.vol_normal_ab > 0 ? gt.price_normal_ab / gt.vol_normal_ab : 0,
        special_ab: gt.vol_special_ab > 0 ? gt.price_special_ab / gt.vol_special_ab : 0,
        avg_ab: gt.vol_ab > 0 ? gt.price_ab / gt.vol_ab : 0,

        normal_c: gt.vol_normal_c > 0 ? gt.price_normal_c / gt.vol_normal_c : 0,
        special_c: gt.vol_special_c > 0 ? gt.price_special_c / gt.vol_special_c : 0,
        avg_c: gt.vol_c > 0 ? gt.price_c / gt.vol_c : 0,

        normal_p: gt.vol_normal_p > 0 ? gt.price_normal_p / gt.vol_normal_p : 0,
        special_p: gt.vol_special_p > 0 ? gt.price_special_p / gt.vol_special_p : 0,
        avg_p: gt.vol_p > 0 ? gt.price_p / gt.vol_p : 0,

        normal_pp: gt.vol_normal_pp > 0 ? gt.price_normal_pp / gt.vol_normal_pp : 0,
        special_pp: gt.vol_special_pp > 0 ? gt.price_special_pp / gt.vol_special_pp : 0,
        avg_pp: gt.vol_pp > 0 ? gt.price_pp / gt.vol_pp : 0,

        avg_total: gt.total_volumn > 0 ? gt.total_price / gt.total_volumn : 0
      };

      res.json({
        success: true,
        data: rows,
        grandTotal
      });
    } catch (error) {
      console.error('Report Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายงานสรุปราคาเฉลี่ย' });
    }
  },

  // --- 4. ฟังก์ชัน สร้างไฟล์ Excel สำหรับรายงานราคาเฉลี่ย ---
  exportAveragePriceReportExcel: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code } = req.query;
      
      const rows = await ReportModel.getAveragePriceReport({ branch_id, start_date, end_date, store_code });

      // คำนวณ Grand Total 
      let gt = {
        price_normal_ab: 0, vol_normal_ab: 0, price_special_ab: 0, vol_special_ab: 0, price_ab: 0, vol_ab: 0,
        price_normal_c: 0, vol_normal_c: 0, price_special_c: 0, vol_special_c: 0, price_c: 0, vol_c: 0,
        price_normal_p: 0, vol_normal_p: 0, price_special_p: 0, vol_special_p: 0, price_p: 0, vol_p: 0,
        price_normal_pp: 0, vol_normal_pp: 0, price_special_pp: 0, vol_special_pp: 0, price_pp: 0, vol_pp: 0,
        total_price: 0, total_volumn: 0
      };

      rows.forEach(row => {
        gt.price_normal_ab += Number(row.price_normal_ab || 0); gt.vol_normal_ab += Number(row.vol_normal_ab || 0);
        gt.price_special_ab += Number(row.price_special_ab || 0); gt.vol_special_ab += Number(row.vol_special_ab || 0);
        gt.price_ab += Number(row.price_ab || 0); gt.vol_ab += Number(row.vol_ab || 0);
        
        gt.price_normal_c += Number(row.price_normal_c || 0); gt.vol_normal_c += Number(row.vol_normal_c || 0);
        gt.price_special_c += Number(row.price_special_c || 0); gt.vol_special_c += Number(row.vol_special_c || 0);
        gt.price_c += Number(row.price_c || 0); gt.vol_c += Number(row.vol_c || 0);
        
        gt.price_normal_p += Number(row.price_normal_p || 0); gt.vol_normal_p += Number(row.vol_normal_p || 0);
        gt.price_special_p += Number(row.price_special_p || 0); gt.vol_special_p += Number(row.vol_special_p || 0);
        gt.price_p += Number(row.price_p || 0); gt.vol_p += Number(row.vol_p || 0);
        
        gt.price_normal_pp += Number(row.price_normal_pp || 0); gt.vol_normal_pp += Number(row.vol_normal_pp || 0);
        gt.price_special_pp += Number(row.price_special_pp || 0); gt.vol_special_pp += Number(row.vol_special_pp || 0);
        gt.price_pp += Number(row.price_pp || 0); gt.vol_pp += Number(row.vol_pp || 0);
        
        gt.total_price += Number(row.total_price || 0); gt.total_volumn += Number(row.total_volumn || 0);
      });

      const grandTotal = {
        normal_ab: gt.vol_normal_ab > 0 ? gt.price_normal_ab / gt.vol_normal_ab : 0,
        special_ab: gt.vol_special_ab > 0 ? gt.price_special_ab / gt.vol_special_ab : 0,
        avg_ab: gt.vol_ab > 0 ? gt.price_ab / gt.vol_ab : 0,
        normal_c: gt.vol_normal_c > 0 ? gt.price_normal_c / gt.vol_normal_c : 0,
        special_c: gt.vol_special_c > 0 ? gt.price_special_c / gt.vol_special_c : 0,
        avg_c: gt.vol_c > 0 ? gt.price_c / gt.vol_c : 0,
        normal_p: gt.vol_normal_p > 0 ? gt.price_normal_p / gt.vol_normal_p : 0,
        special_p: gt.vol_special_p > 0 ? gt.price_special_p / gt.vol_special_p : 0,
        avg_p: gt.vol_p > 0 ? gt.price_p / gt.vol_p : 0,
        normal_pp: gt.vol_normal_pp > 0 ? gt.price_normal_pp / gt.vol_normal_pp : 0,
        special_pp: gt.vol_special_pp > 0 ? gt.price_special_pp / gt.vol_special_pp : 0,
        avg_pp: gt.vol_pp > 0 ? gt.price_pp / gt.vol_pp : 0,
        avg_total: gt.total_volumn > 0 ? gt.total_price / gt.total_volumn : 0
      };

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Average Price Report');

      // กำหนด Header แบบ 2 ชั้น
      worksheet.mergeCells('A1:A2');
      worksheet.getCell('A1').value = 'แผนก';
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      worksheet.getCell('A1').font = { bold: true };

      worksheet.mergeCells('B1:N1');
      worksheet.getCell('B1').value = 'เฉลี่ยราคา';
      worksheet.getCell('B1').alignment = { horizontal: 'center' };
      worksheet.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      worksheet.getCell('B1').font = { bold: true };

      const headers = ['AB ปกติ', 'AB พิเศษ', 'AB', 'C ปกติ', 'C พิเศษ', 'C', 'P ปกติ', 'P พิเศษ', 'P', 'PP ปกติ', 'PP พิเศษ', 'PP', 'รวม'];
      headers.forEach((header, index) => {
        const colLetter = String.fromCharCode(66 + index); // ตัวอักษรเริ่มจาก B
        const cell = worksheet.getCell(`${colLetter}2`);
        cell.value = header;
        cell.alignment = { horizontal: 'center' };
        
        // ลงสี Background
        if (['AB', 'C', 'P', 'PP'].includes(header)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }; 
          cell.font = { bold: true };
        } else if (header === 'รวม') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; 
          cell.font = { bold: true };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }
      });
      
      worksheet.getColumn('A').width = 18;
      for (let i = 2; i <= 14; i++) worksheet.getColumn(i).width = 11;

      // วนลูปข้อมูลใส่ตาราง
      rows.forEach(row => {
        const addedRow = worksheet.addRow([
          row.saw_name || 'ไม่ระบุ',
          Number(row.normal_ab) > 0 ? Number(row.normal_ab) : null,
          Number(row.special_ab) > 0 ? Number(row.special_ab) : null,
          Number(row.avg_ab) > 0 ? Number(row.avg_ab) : null,
          Number(row.normal_c) > 0 ? Number(row.normal_c) : null,
          Number(row.special_c) > 0 ? Number(row.special_c) : null,
          Number(row.avg_c) > 0 ? Number(row.avg_c) : null,
          Number(row.normal_p) > 0 ? Number(row.normal_p) : null,
          Number(row.special_p) > 0 ? Number(row.special_p) : null,
          Number(row.avg_p) > 0 ? Number(row.avg_p) : null,
          Number(row.normal_pp) > 0 ? Number(row.normal_pp) : null,
          Number(row.special_pp) > 0 ? Number(row.special_pp) : null,
          Number(row.avg_pp) > 0 ? Number(row.avg_pp) : null,
          Number(row.avg_total) > 0 ? Number(row.avg_total) : null,
        ]);
        
        // Format ตัวเลข 2 ตำแหน่ง
        for(let i=2; i<=14; i++) addedRow.getCell(i).numFmt = '#,##0.00';
        
        addedRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }; 
        addedRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }; 
        addedRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }; 
        addedRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }; 
        addedRow.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; 
        addedRow.getCell(14).font = { bold: true, color: { argb: 'FF375623' } };
      });

      // แถว Grand Total
      const gtRow = worksheet.addRow([
        'รวมทั้งหมด',
        Number(grandTotal.normal_ab) > 0 ? Number(grandTotal.normal_ab) : null,
        Number(grandTotal.special_ab) > 0 ? Number(grandTotal.special_ab) : null,
        Number(grandTotal.avg_ab) > 0 ? Number(grandTotal.avg_ab) : null,
        Number(grandTotal.normal_c) > 0 ? Number(grandTotal.normal_c) : null,
        Number(grandTotal.special_c) > 0 ? Number(grandTotal.special_c) : null,
        Number(grandTotal.avg_c) > 0 ? Number(grandTotal.avg_c) : null,
        Number(grandTotal.normal_p) > 0 ? Number(grandTotal.normal_p) : null,
        Number(grandTotal.special_p) > 0 ? Number(grandTotal.special_p) : null,
        Number(grandTotal.avg_p) > 0 ? Number(grandTotal.avg_p) : null,
        Number(grandTotal.normal_pp) > 0 ? Number(grandTotal.normal_pp) : null,
        Number(grandTotal.special_pp) > 0 ? Number(grandTotal.special_pp) : null,
        Number(grandTotal.avg_pp) > 0 ? Number(grandTotal.avg_pp) : null,
        Number(grandTotal.avg_total) > 0 ? Number(grandTotal.avg_total) : null,
      ]);
      
      gtRow.font = { bold: true };
      gtRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA6A6A6' } };
      for(let i=2; i<=14; i++) gtRow.getCell(i).numFmt = '#,##0.00';
      gtRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
      gtRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
      gtRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
      gtRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
      gtRow.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } }; 
      
      // ตีเส้นตาราง
      worksheet.eachRow({ includeEmpty: true }, function(row) {
        row.eachCell({ includeEmpty: true }, function(cell) {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=average_price_report.xlsx');
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error generating Excel' });
    }
  },

  // --- 5. ฟังก์ชัน สร้างไฟล์ PDF สำหรับรายงานราคาเฉลี่ย ---
  exportAveragePriceReportPDF: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code, branch_name } = req.query;
      const rows = await ReportModel.getAveragePriceReport({ branch_id, start_date, end_date, store_code });

      let gt = {
        price_normal_ab: 0, vol_normal_ab: 0, price_special_ab: 0, vol_special_ab: 0, price_ab: 0, vol_ab: 0,
        price_normal_c: 0, vol_normal_c: 0, price_special_c: 0, vol_special_c: 0, price_c: 0, vol_c: 0,
        price_normal_p: 0, vol_normal_p: 0, price_special_p: 0, vol_special_p: 0, price_p: 0, vol_p: 0,
        price_normal_pp: 0, vol_normal_pp: 0, price_special_pp: 0, vol_special_pp: 0, price_pp: 0, vol_pp: 0,
        total_price: 0, total_volumn: 0
      };

      rows.forEach(row => {
        gt.price_normal_ab += Number(row.price_normal_ab || 0); gt.vol_normal_ab += Number(row.vol_normal_ab || 0);
        gt.price_special_ab += Number(row.price_special_ab || 0); gt.vol_special_ab += Number(row.vol_special_ab || 0);
        gt.price_ab += Number(row.price_ab || 0); gt.vol_ab += Number(row.vol_ab || 0);
        
        gt.price_normal_c += Number(row.price_normal_c || 0); gt.vol_normal_c += Number(row.vol_normal_c || 0);
        gt.price_special_c += Number(row.price_special_c || 0); gt.vol_special_c += Number(row.vol_special_c || 0);
        gt.price_c += Number(row.price_c || 0); gt.vol_c += Number(row.vol_c || 0);
        
        gt.price_normal_p += Number(row.price_normal_p || 0); gt.vol_normal_p += Number(row.vol_normal_p || 0);
        gt.price_special_p += Number(row.price_special_p || 0); gt.vol_special_p += Number(row.vol_special_p || 0);
        gt.price_p += Number(row.price_p || 0); gt.vol_p += Number(row.vol_p || 0);
        
        gt.price_normal_pp += Number(row.price_normal_pp || 0); gt.vol_normal_pp += Number(row.vol_normal_pp || 0);
        gt.price_special_pp += Number(row.price_special_pp || 0); gt.vol_special_pp += Number(row.vol_special_pp || 0);
        gt.price_pp += Number(row.price_pp || 0); gt.vol_pp += Number(row.vol_pp || 0);
        
        gt.total_price += Number(row.total_price || 0); gt.total_volumn += Number(row.total_volumn || 0);
      });

      const grandTotal = {
        normal_ab: gt.vol_normal_ab > 0 ? gt.price_normal_ab / gt.vol_normal_ab : 0,
        special_ab: gt.vol_special_ab > 0 ? gt.price_special_ab / gt.vol_special_ab : 0,
        avg_ab: gt.vol_ab > 0 ? gt.price_ab / gt.vol_ab : 0,
        normal_c: gt.vol_normal_c > 0 ? gt.price_normal_c / gt.vol_normal_c : 0,
        special_c: gt.vol_special_c > 0 ? gt.price_special_c / gt.vol_special_c : 0,
        avg_c: gt.vol_c > 0 ? gt.price_c / gt.vol_c : 0,
        normal_p: gt.vol_normal_p > 0 ? gt.price_normal_p / gt.vol_normal_p : 0,
        special_p: gt.vol_special_p > 0 ? gt.price_special_p / gt.vol_special_p : 0,
        avg_p: gt.vol_p > 0 ? gt.price_p / gt.vol_p : 0,
        normal_pp: gt.vol_normal_pp > 0 ? gt.price_normal_pp / gt.vol_normal_pp : 0,
        special_pp: gt.vol_special_pp > 0 ? gt.price_special_pp / gt.vol_special_pp : 0,
        avg_pp: gt.vol_pp > 0 ? gt.price_pp / gt.vol_pp : 0,
        avg_total: gt.total_volumn > 0 ? gt.total_price / gt.total_volumn : 0
      };

      const fontPath = path.join(__dirname, '../assets/fonts/THSarabunNew.ttf');
      let fontBase64 = '';
      if (fs.existsSync(fontPath)) fontBase64 = fs.readFileSync(fontPath).toString('base64');

      let tableRows = '';
      rows.forEach((row) => {
        tableRows += `
          <tr>
            <td class="left pl">${row.saw_name || 'ไม่ระบุ'}</td>
            <td>${Number(row.normal_ab) > 0 ? Number(row.normal_ab).toFixed(2) : ''}</td>
            <td>${Number(row.special_ab) > 0 ? Number(row.special_ab).toFixed(2) : ''}</td>
            <td class="bg-blue-light bold">${Number(row.avg_ab) > 0 ? Number(row.avg_ab).toFixed(2) : ''}</td>
            
            <td>${Number(row.normal_c) > 0 ? Number(row.normal_c).toFixed(2) : ''}</td>
            <td>${Number(row.special_c) > 0 ? Number(row.special_c).toFixed(2) : ''}</td>
            <td class="bg-blue-light bold">${Number(row.avg_c) > 0 ? Number(row.avg_c).toFixed(2) : ''}</td>

            <td>${Number(row.normal_p) > 0 ? Number(row.normal_p).toFixed(2) : ''}</td>
            <td>${Number(row.special_p) > 0 ? Number(row.special_p).toFixed(2) : ''}</td>
            <td class="bg-blue-light bold">${Number(row.avg_p) > 0 ? Number(row.avg_p).toFixed(2) : ''}</td>

            <td>${Number(row.normal_pp) > 0 ? Number(row.normal_pp).toFixed(2) : ''}</td>
            <td>${Number(row.special_pp) > 0 ? Number(row.special_pp).toFixed(2) : ''}</td>
            <td class="bg-blue-light bold">${Number(row.avg_pp) > 0 ? Number(row.avg_pp).toFixed(2) : ''}</td>

            <td class="bg-green-light bold">${Number(row.avg_total) > 0 ? Number(row.avg_total).toFixed(2) : ''}</td>
          </tr>
        `;
      });

      if (rows.length > 0) {
        tableRows += `
          <tr class="gt-row">
            <td class="left pl bg-gray-header">รวมทั้งหมด</td>
            <td>${Number(grandTotal.normal_ab) > 0 ? Number(grandTotal.normal_ab).toFixed(2) : '0'}</td>
            <td>${Number(grandTotal.special_ab) > 0 ? Number(grandTotal.special_ab).toFixed(2) : '0'}</td>
            <td class="bg-blue-dark">${Number(grandTotal.avg_ab) > 0 ? Number(grandTotal.avg_ab).toFixed(2) : '0'}</td>
            
            <td>${Number(grandTotal.normal_c) > 0 ? Number(grandTotal.normal_c).toFixed(2) : '0'}</td>
            <td>${Number(grandTotal.special_c) > 0 ? Number(grandTotal.special_c).toFixed(2) : '0'}</td>
            <td class="bg-blue-dark">${Number(grandTotal.avg_c) > 0 ? Number(grandTotal.avg_c).toFixed(2) : '0'}</td>

            <td>${Number(grandTotal.normal_p) > 0 ? Number(grandTotal.normal_p).toFixed(2) : '0'}</td>
            <td>${Number(grandTotal.special_p) > 0 ? Number(grandTotal.special_p).toFixed(2) : '0'}</td>
            <td class="bg-blue-dark">${Number(grandTotal.avg_p) > 0 ? Number(grandTotal.avg_p).toFixed(2) : '0'}</td>

            <td>${Number(grandTotal.normal_pp) > 0 ? Number(grandTotal.normal_pp).toFixed(2) : '0'}</td>
            <td>${Number(grandTotal.special_pp) > 0 ? Number(grandTotal.special_pp).toFixed(2) : '0'}</td>
            <td class="bg-blue-dark">${Number(grandTotal.avg_pp) > 0 ? Number(grandTotal.avg_pp).toFixed(2) : '0'}</td>

            <td class="bg-green-dark">${Number(grandTotal.avg_total) > 0 ? Number(grandTotal.avg_total).toFixed(2) : '0'}</td>
          </tr>
        `;
      }

      const htmlContent = `
        <html>
          <head>
            <style>
              @font-face {
                font-family: 'THSarabun';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              body { font-family: 'THSarabun', sans-serif; font-size: 13px; margin: 0; padding: 20px; }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid #000; padding: 4px; text-align: right; }
              th { background-color: #d9d9d9; text-align: center; font-weight: bold; }
              .center { text-align: center; }
              .left { text-align: left; }
              .pl { padding-left: 10px; }
              .bold { font-weight: bold; }
              .bg-blue-light { background-color: #e6f2ff; }
              .bg-green-light { background-color: #e2efda; color: #375623; }
              .gt-row { font-weight: bold; }
              .bg-gray-header { background-color: #a6a6a6; }
              .bg-blue-dark { background-color: #bdd7ee; }
              .bg-green-dark { background-color: #a9d08e; }
              .title-box { text-align: center; margin-bottom: 15px; }
              h1 { font-size: 20px; margin: 0 0 5px 0; font-weight: bold; }
              h2 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; }
              p { margin: 0; font-size: 14px; color: #444; }
            </style>
          </head>
          <body>
            <div class="title-box">
              <h1>บริษัท วู้ดเวิร์ค จำกัด (${branch_name || ''})</h1>
              <h2>รายงานเปรียบเทียบราคาขายเฉลี่ย ตามแผนกและเกรดไม้</h2>
              <p>ตั้งแต่วันที่ ${start_date} ถึงวันที่ ${end_date} สโตร์: ${store_code || 'รวมทุกสโตร์'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="vertical-align: middle;">แผนก</th>
                  <th colspan="13">เฉลี่ยราคา</th>
                </tr>
                <tr>
                  <th>AB ปกติ</th><th>AB พิเศษ</th><th class="bg-blue-light">AB</th>
                  <th>C ปกติ</th><th>C พิเศษ</th><th class="bg-blue-light">C</th>
                  <th>P ปกติ</th><th>P พิเศษ</th><th class="bg-blue-light">P</th>
                  <th>PP ปกติ</th><th>PP พิเศษ</th><th class="bg-blue-light">PP</th>
                  <th class="bg-green-light">รวม</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        landscape: true, 
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="average_price_report.pdf"');
      res.send(pdfBuffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
  },

  // เพิ่มเข้าไปใน reportController
  getProductionThickMil: async (req, res) => {
    try {
      const { branch_id, start_date, end_date, store_code } = req.query;

      if (!branch_id || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'ระบุพารามิเตอร์ไม่ครบถ้วน' });
      }

      const rows = await ReportModel.getProductionThickMilReport({ branch_id, start_date, end_date, store_code });

      // 1. คำนวณยอดรวมทั้งหมด (Grand Total) และ สรุปสัดส่วนความยาว
      let grand_total_volumn = 0;
      let grand_total_amount = 0;
      const lengthSummaryMap = {};

      rows.forEach(row => {
        const vol = Number(row.ab_volumn) || 0;
        const amt = Number(row.ab_amount) || 0;
        const len = row.length;
        
        grand_total_volumn += vol;
        grand_total_amount += amt;

        if (!lengthSummaryMap[len]) lengthSummaryMap[len] = 0;
        lengthSummaryMap[len] += vol;
      });

      // 2. จัดกลุ่มข้อมูล (Thick_Mil -> Length -> WoodCode)
      const grouped = rows.reduce((acc, row) => {
        const tm = row.thick_mil;
        const l = row.length;
        const vol = Number(row.ab_volumn) || 0;
        const amt = Number(row.ab_amount) || 0;

        if (!acc[tm]) {
          acc[tm] = { thick_mil: tm, thick: row.thick, lengths: {}, total_volumn: 0, total_amount: 0 };
        }

        if (!acc[tm].lengths[l]) {
          acc[tm].lengths[l] = { length: l, items: [], sub_volumn: 0, sub_amount: 0 };
        }

        acc[tm].lengths[l].items.push({
          wood_code: row.wood_code,
          ab_volumn: vol,
          ab_amount: amt,
          avg_price: vol > 0 ? amt / vol : 0
        });

        acc[tm].lengths[l].sub_volumn += vol;
        acc[tm].lengths[l].sub_amount += amt;
        acc[tm].total_volumn += vol;
        acc[tm].total_amount += amt;

        return acc;
      }, {});

      // 3. คำนวณเปอร์เซ็นต์ (% กว้าง, % ยาว, % ความหนา)
      const formattedData = Object.values(grouped).map(tmGroup => {
        const lengthsArr = Object.values(tmGroup.lengths).map(lenGroup => {
          lenGroup.items = lenGroup.items.map(item => {
             // % กว้าง (เทียบกับยอดรวมของความยาวนั้น)
             item.pct_width = lenGroup.sub_volumn > 0 ? (item.ab_volumn / lenGroup.sub_volumn) * 100 : 0;
             return item;
          });
          // % ยาว (เทียบกับยอดรวมของความหนา-มิลไม้นั้น)
          lenGroup.pct_length = tmGroup.total_volumn > 0 ? (lenGroup.sub_volumn / tmGroup.total_volumn) * 100 : 0;
          return lenGroup;
        });

        return {
          thick_mil: tmGroup.thick_mil,
          lengths: lengthsArr,
          total_volumn: tmGroup.total_volumn,
          total_amount: tmGroup.total_amount,
          // % หน้าไม้นี้ รวมพิเศษ (เทียบกับยอดรวมทั้งรายงาน)
          pct_thick_total: grand_total_volumn > 0 ? (tmGroup.total_volumn / grand_total_volumn) * 100 : 0,
          avg_price: tmGroup.total_volumn > 0 ? tmGroup.total_amount / tmGroup.total_volumn : 0
        };
      });

      // 4. สรุปสัดส่วนความยาวภาพรวม
      const lengthSummary = Object.keys(lengthSummaryMap).sort((a,b) => Number(a) - Number(b)).map(len => {
         const vol = lengthSummaryMap[len];
         return {
           length: len,
           volumn: vol,
           pct: grand_total_volumn > 0 ? (vol / grand_total_volumn) * 100 : 0
         };
      });

      const grandTotal = {
        total_volumn: grand_total_volumn,
        total_amount: grand_total_amount,
        avg_price: grand_total_volumn > 0 ? grand_total_amount / grand_total_volumn : 0
      };

      res.json({
        success: true,
        data: formattedData,
        grandTotal,
        lengthSummary
      });

    } catch (error) {
      console.error('Report Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายงาน' });
    }
  },
  
  // --- นำไปใส่ต่อท้ายใน reportController ---
  exportProductionThickMilExcel: async (req, res) => {
    try {
      const { start_date, end_date, branch_id, store_code } = req.query;
      const { formattedData, grandTotal, lengthSummary } = await fetchProductionThickMilData(start_date, end_date, branch_id, store_code);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      worksheet.columns = [
        { header: 'ขนาดไม้', key: 'col1', width: 20 },
        { header: '', key: 'col2', width: 15 },
        { header: 'AB', key: 'ab_vol', width: 15 },
        { header: '% กว้าง', key: 'pct_w', width: 15 },
        { header: '% ยาว', key: 'pct_l', width: 15 },
        { header: 'ราคา', key: 'price', width: 15 },
        { header: 'จำนวนเงิน', key: 'amount', width: 20 }
      ];

      worksheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = 'ขนาดไม้';

      formattedData.forEach(tmGroup => {
        const tmRow = worksheet.addRow(['ความหนา', `${tmGroup.thick_mil} mm`]);
        
        tmGroup.lengths.forEach(lenGroup => {
          lenGroup.items.forEach(item => {
            worksheet.addRow([
              '', item.wood_code,
              item.ab_volumn, `${item.pct_width.toFixed(2)}%`,
              '', item.avg_price > 0 ? item.avg_price : '', item.ab_amount
            ]);
          });
          
          const lenRow = worksheet.addRow([
            `รวมยาว ${lenGroup.length}`, '',
            lenGroup.sub_volumn, '', `${lenGroup.pct_length.toFixed(2)}%`,
            '', lenGroup.sub_amount
          ]);
          lenRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
          lenRow.font = { bold: true };
        });

        const thickRow = worksheet.addRow([
          `รวมหนา ${tmGroup.thick_mil} mm`, '', tmGroup.total_volumn, '', '', '', tmGroup.total_amount
        ]);
        thickRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
        thickRow.font = { bold: true };

        const pctRow = worksheet.addRow(['% หน้าไม้นี้ รวมพิเศษ', '', tmGroup.pct_thick_total]);
        pctRow.getCell(3).numFmt = '0.00"%"';
        pctRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
        pctRow.getCell(3).font = { color: { argb: 'FFC00000' }, bold: true };

        const avgRow = worksheet.addRow(['ราคาเฉลี่ย', '', tmGroup.avg_price]);
        avgRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        avgRow.getCell(3).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });

      if (grandTotal) {
        const gtRow = worksheet.addRow(['รวม ลบ. ฟุต ทั้งหมด', '', grandTotal.total_volumn, '100%', '', '', grandTotal.total_amount]);
        gtRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8EA9DB' } };
        gtRow.font = { bold: true };
        
        const gtAvgRow = worksheet.addRow(['ราคาเฉลี่ย', '', grandTotal.avg_price]);
        gtAvgRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
        gtAvgRow.getCell(3).font = { color: { argb: 'FFC00000' }, bold: true };
        gtAvgRow.font = { bold: true };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=production_thick_mil.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error Excel' });
    }
  },

  exportProductionThickMilPDF: async (req, res) => {
    try {
      const { start_date, end_date, branch_id, store_code, branch_name } = req.query;
      const { formattedData, grandTotal, lengthSummary } = await fetchProductionThickMilData(start_date, end_date, branch_id, store_code);

      const fs = require('fs');
      const path = require('path');
      const fontPath = path.join(__dirname, '../assets/fonts/THSarabunNew.ttf');
      let fontBase64 = fs.existsSync(fontPath) ? fs.readFileSync(fontPath).toString('base64') : '';

      let rowsHtml = '';
      formattedData.forEach(tmGroup => {
        rowsHtml += `<tr><td class="left pl">ความหนา</td><td class="left pl">${tmGroup.thick_mil} mm</td><td colspan="5"></td></tr>`;
        
        tmGroup.lengths.forEach(lenGroup => {
          lenGroup.items.forEach(item => {
            rowsHtml += `
              <tr>
                <td></td><td class="left pl text-blue">${item.wood_code}</td>
                <td>${item.ab_volumn.toFixed(4)}</td><td class="text-gray">${item.pct_width.toFixed(2)}%</td>
                <td></td><td>${item.avg_price > 0 ? item.avg_price.toFixed(2) : ''}</td>
                <td>${item.ab_amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
              </tr>`;
          });
          rowsHtml += `
            <tr class="bg-yellow bold">
              <td colspan="2" class="left pl">รวมยาว ${lenGroup.length}</td>
              <td>${lenGroup.sub_volumn.toFixed(4)}</td><td></td>
              <td>${lenGroup.pct_length.toFixed(2)}%</td><td></td>
              <td>${lenGroup.sub_amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            </tr>`;
        });
        
        rowsHtml += `
          <tr class="bg-green bold text-green-dark border-b">
            <td colspan="2" class="left pl">รวมหนา ${tmGroup.thick_mil} mm</td>
            <td>${tmGroup.total_volumn.toFixed(4)}</td><td colspan="3"></td>
            <td>${tmGroup.total_amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
          </tr>
          <tr><td colspan="2" class="left pl">% หน้าไม้นี้ รวมพิเศษ</td><td class="bg-yellow-light bold text-red">${tmGroup.pct_thick_total.toFixed(2)}%</td><td colspan="4"></td></tr>
          <tr><td colspan="2" class="left pl">ราคาเฉลี่ย</td><td class="bg-red bold text-white">${tmGroup.avg_price.toFixed(2)}</td><td colspan="4"></td></tr>
        `;
      });

      if(grandTotal) {
        rowsHtml += `
          <tr class="bg-blue bold border-t">
            <td colspan="2" class="left pl">รวม ลบ. ฟุต ทั้งหมด</td><td class="text-blue-dark">${grandTotal.total_volumn.toFixed(4)}</td>
            <td>100%</td><td colspan="2"></td><td class="text-blue-dark">${grandTotal.total_amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
          </tr>
          <tr class="bg-gray bold">
            <td colspan="2" class="left pl">ราคาเฉลี่ย</td><td class="bg-yellow-light text-red">${grandTotal.avg_price.toFixed(2)}</td><td colspan="4"></td>
          </tr>
        `;
      }

      let summaryHtml = '';
      if(lengthSummary.length > 0) {
        lengthSummary.forEach(sum => {
          summaryHtml += `<tr><td class="left pl">รวมปริมาตร ${sum.length} ม.</td><td>${sum.volumn.toFixed(4)}</td><td>${sum.pct.toFixed(2)}%</td></tr>`;
        });
        summaryHtml += `<tr class="bg-gray bold"><td class="left pl">รวมปริมาตรทั้งหมด</td><td>${grandTotal.total_volumn.toFixed(2)}</td><td>100.00%</td></tr>`;
      }

      const htmlContent = `
        <html><head><style>
          @font-face { font-family: 'THSarabun'; src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype'); }
          body { font-family: 'THSarabun', sans-serif; font-size: 13px; margin: 0; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #777; padding: 4px; text-align: right; }
          th { background-color: #b4c6e7; font-weight: bold; text-align: center; }
          .left { text-align: left; } .pl { padding-left: 10px; } .bold { font-weight: bold; }
          .bg-yellow { background-color: #fff2cc; } .bg-green { background-color: #c6e0b4; }
          .bg-yellow-light { background-color: #ffe699; } .bg-red { background-color: #ff0000; }
          .bg-blue { background-color: #8ea9db; } .bg-gray { background-color: #e2e8f0; }
          .text-red { color: #c00000; } .text-white { color: #fff; }
          .text-blue { color: #1e3a8a; } .text-blue-dark { color: #1e3a8a; } .text-green-dark { color: #14532d; }
          .text-gray { color: #4b5563; }
          .border-b { border-bottom: 2px solid #555; } .border-t { border-top: 2px solid #555; }
        </style></head><body>
          <div style="text-align:center; margin-bottom:15px;">
            <h1 style="font-size:20px; margin:0;">บริษัท วู้ดเวิร์ค จำกัด (${branch_name || ''})</h1>
            <h2 style="font-size:16px; margin:0;">รายงานการผลิต แยกตาม ความหนา-มิลไม้</h2>
            <p style="margin:0;">ตั้งแต่วันที่ ${start_date} ถึง ${end_date}</p>
          </div>
          <table>
            <thead><tr><th colspan="2">ขนาดไม้</th><th>AB</th><th>% กว้าง</th><th>% ยาว</th><th>ราคา</th><th>จำนวนเงิน</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="width:50%; margin-top:20px;">
            <table>
              <thead><tr><th style="background:#f3f4f6; text-align:left;">สรุปสัดส่วนความยาว</th><th style="background:#f3f4f6;">ปริมาตร</th><th style="background:#f3f4f6;">เปอร์เซ็นต์</th></tr></thead>
              <tbody>${summaryHtml}</tbody>
            </table>
          </div>
        </body></html>
      `;

      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', landscape: false, printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }});
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="report.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error PDF' });
    }
  }

};

module.exports = reportController;