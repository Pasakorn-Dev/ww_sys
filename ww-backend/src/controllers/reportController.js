const pool = require('../config/db');
const ReportModel = require('../models/reportModel');
const puppeteer = require('puppeteer'); // หรือใช้ library ทำ PDF ที่ระบบคุณมีอยู่แล้ว
const ExcelJS = require('exceljs'); // <- ต้องมีบรรทัดนี้
const fs = require('fs');      
const path = require('path');  

// --- 1. สร้างฟังก์ชันกลาง สำหรับดึงและคำนวณข้อมูล (ลดโค้ดซ้ำ) ---
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

  const { rows } = await pool.query(query, [start_date, end_date, branch_id]);

  // ลอจิกการ Reduce จัดกลุ่มข้อมูลเหมือนเดิมทุกประการ...
  const groupedData = rows.reduce((acc, row) => {
    /* ... (วางโค้ดลอจิก reduce การจัดกลุ่ม ชุดเลื่อย > ความหนา > ความยาว > รายละเอียด ที่เราเขียนไว้ก่อนหน้านี้ลงตรงนี้) ... */
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

  return finalData;
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

  // ฟังก์ชัน API เดิมของ JSON 
  getAbWoodReport: async (req, res) => {
    try {
      const { start_date, end_date, branch_id } = req.query;
      if (!branch_id || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing parameters' });
      
      const finalData = await fetchWoodTypeAbData(start_date, end_date, branch_id);
      res.status(200).json({ success: true, data: finalData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // --- 2. ฟังก์ชัน สร้างไฟล์ Excel (Blob) ---
  exportAbWoodReportExcel: async (req, res) => {
    try {
      const { start_date, end_date, branch_id } = req.query;
      const data = await fetchWoodTypeAbData(start_date, end_date, branch_id);

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

      // วนลูปวาดข้อมูลทีละบรรทัด (จำลองโครงสร้างที่ทำใน React)
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
                 item.ab_volumn, item.ab_pct_qty + '%', '', item.ab_price, item.ab_amt,
                 item.spc_volumn, item.spc_volumn > 0 ? item.spc_pct_qty + '%' : '', '', item.spc_price, item.spc_amt
               ]);
            });
            // บรรทัด รวมยาว
            const lenRow = worksheet.addRow([`รวมยาว ${len.length}`, '', len.subTotal.ab_volumn, '100%', len.subTotal.ab_pct_amt + '%', '', len.subTotal.ab_amt, len.subTotal.spc_volumn, '100%', len.subTotal.spc_pct_amt + '%', '', len.subTotal.spc_amt]);
            lenRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
            lenRow.font = { bold: true };
          });

          // บรรทัด รวมหนา
          const thickSubRow = worksheet.addRow(['รวมหนา', thick.thick, thick.subTotal.ab_volumn, '', '100%', '', thick.subTotal.ab_amt, thick.subTotal.spc_volumn, '', '100%', '', thick.subTotal.spc_amt]);
          thickSubRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
          thickSubRow.font = { bold: true };
        });
      });

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
      const data = await fetchWoodTypeAbData(start_date, end_date, branch_id);
      // 1. กำหนดที่อยู่ของไฟล์ฟอนต์ (อ้างอิงจากตำแหน่งไฟล์ reportController.js)
      // โค้ดนี้จะถอยกลับไป 1 โฟลเดอร์ (../) แล้วเข้าไปที่ assets/fonts
      const fontPath = path.join(__dirname, '../assets/fonts/THSarabunNew.ttf');
      
      // 2. อ่านไฟล์ฟอนต์และแปลงเป็น Base64
      let fontBase64 = '';
      if (fs.existsSync(fontPath)) {
        fontBase64 = fs.readFileSync(fontPath).toString('base64');
      } else {
        console.warn('⚠️ ไม่พบไฟล์ฟอนต์ที่:', fontPath);
      }
      // วนลูปสร้างแถวข้อมูลตาราง
      let tableRows = '';
      data.forEach((saw, sIdx) => {
        // แถวชุดเลื่อย
        tableRows += `<tr class="saw"><td colspan="2" class="left pl">${saw.saw_name}</td><td colspan="10" class="left pl">ชุดที่ ${sIdx + 1}</td></tr>`;

        saw.thicks.forEach(thick => {
          // แถวความหนา
          tableRows += `<tr class="thick"><td class="left pl text-blue">ความหนา</td><td colspan="11" class="left pl text-blue">${thick.thick}</td></tr>`;

          thick.lengths.forEach(len => {
            // แถวรายการรหัสไม้
            len.items.forEach(item => {
              tableRows += `
                <tr>
                  <td colspan="2" class="left pl"><span class="text-red bold">${item.wood_code.substring(0, 2)}</span>${item.wood_code.substring(2)}</td>
                  <td>${item.ab_volumn.toFixed(4)}</td>
                  <td>${item.ab_pct_qty.toFixed(2)}%</td>
                  <td class="bg-gray"></td>
                  <td>${item.ab_price > 0 ? item.ab_price.toFixed(2) : ''}</td>
                  <td>${item.ab_amt.toFixed(2)}</td>
                  <td>${item.spc_volumn.toFixed(4)}</td>
                  <td>${item.spc_volumn > 0 ? item.spc_pct_qty.toFixed(2) + '%' : ''}</td>
                  <td class="bg-gray"></td>
                  <td>${item.spc_price > 0 ? item.spc_price.toFixed(2) : ''}</td>
                  <td>${item.spc_amt.toFixed(2)}</td>
                </tr>
              `;
            });

            // แถวรวมยาว
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

          // แถวรวมหนา
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

          // แถวเปอเซ็นต์ & ราคาเฉลี่ย
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

      // นำแถวข้อมูลไปใส่ในโครง HTML
      const htmlContent = `
        <html>
          <head>
            <style>
              @font-face {
                font-family: 'THSarabun';
                /* นำตัวแปร fontBase64 มาต่อ String ตรงนี้ */
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                font-weight: normal;
                font-style: normal;
              }
              body { font-family: 'THSarabun', sans-serif; font-size: 10px; margin: 0; padding: 20px; }
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
              h1 { font-size: 16px; margin: 0 0 5px 0; }
              h2 { font-size: 14px; margin: 0 0 5px 0; font-weight: normal; }
              p { margin: 0; font-size: 12px; color: #444; }
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
  }
};

module.exports = reportController;