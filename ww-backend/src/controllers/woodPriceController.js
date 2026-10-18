const ExcelJS = require('exceljs');
const WoodPriceModel = require('../models/woodPriceModel'); // เรียกใช้ Model ใหม่

const woodPriceController = {
  
  // ─── 1. ดึงรายการสินค้า ───
  getPrices: async (req, res) => {
    try {
      const { branch_id } = req.query;
      if (!branch_id) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุสาขา' });
      }

      // โยนหน้าที่ Query ให้ Model จัดการ
      const rows = await WoodPriceModel.getWoodPrices(req.query);
      res.json({ success: true, data: rows });

    } catch (error) {
      console.error('Error fetching wood prices:', error);
      res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
    }
  },

  // ─── 2. บันทึกราคาจากการแก้ไขผ่านหน้าเว็บ (Inline Edit) ───
  bulkUpdate: async (req, res) => {
    try {
      const { prices } = req.body; 
      if (!prices || prices.length === 0) {
        return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลให้อัปเดต' });
      }

      await WoodPriceModel.updatePricesByIds(prices);
      res.json({ success: true, message: 'อัปเดตราคาสำเร็จ' });

    } catch (error) {
      console.error('Error bulk updating prices:', error);
      res.status(500).json({ success: false, message: 'บันทึกข้อมูลล้มเหลว' });
    }
  },

  // ─── 3. ดาวน์โหลด (Export) ไฟล์ Excel Template ───
  exportExcel: async (req, res) => {
    try {
      const { branch_id ,paramExport} = req.query;
      if (!branch_id) return res.status(400).send('กรุณาระบุสาขา');
      

      // นำ Model เดิมมา Reuse ใช้ดึงข้อมูลใส่ Excel
      const rows = await WoodPriceModel.getWoodPrices({branch_id ,paramExport});

      const branchInfo = await WoodPriceModel.getBranchFileName(branch_id);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('PriceUpdate');

      worksheet.columns = [
        { header: 'รหัสสินค้า (wood_code)', key: 'wood_code', width: 20 },
        { header: 'ขนาด (หนาxกว้างxยาว) *ห้ามแก้', key: 'size', width: 25 },
        { header: 'ราคาขายต่อหน่วย (unit_price)', key: 'unit_price', width: 25 }
      ];

      rows.forEach(row => {
        worksheet.addRow({
          wood_code: row.wood_code || '-',
          size: `${row.thick} x ${row.width} x ${row.length}`,
          unit_price: row.unit_price || 0
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=WoodPrice_Branch_${branchInfo}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Export excel error:', error);
      res.status(500).send('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    }
  },

  // ─── 4. นำเข้า (Import) ราคาจากไฟล์ Excel ───
  importExcel: async (req, res) => {
    try {
      // รับค่า รหัสสาขา (branch_id) จากฟอร์มที่ส่งมาหน้าเว็บ
      const branchId = req.body.branch_id;
      // รับไฟล์ Excel ที่แนบมา (จัดการโดยไลบรารี multer ซึ่งโหลดไฟล์ไว้ในหน่วยความจำชั่วคราว)
      const file = req.file;

      // ถ้าไม่มีสาขา หรือ ไม่มีไฟล์ส่งมา ให้ตอบกลับหน้าเว็บไปเลยว่า "ข้อมูลไม่ครบถ้วน"
      if (!branchId || !file) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน (ไฟล์ หรือ สาขา)' });
      }

      // สร้างกล่องสมุดงาน Excel (Workbook) เปล่าๆ ด้วยไลบรารี ExcelJS
      const workbook = new ExcelJS.Workbook();
      // สั่งให้อ่านข้อมูลไฟล์ Excel จากหน่วยความจำ (Buffer) เข้าไปใน Workbook
      await workbook.xlsx.load(file.buffer); 
      // เลือกดึงข้อมูลจาก Sheet แรก (index 1) มาทำงาน
      const worksheet = workbook.getWorksheet(1);

      // สร้าง Array ว่างเตรียมเก็บข้อมูลที่จะใช้อัปเดต
      const updates = [];

      // วนลูปอ่านข้อมูลใน Sheet ทีละบรรทัด (row)
      worksheet.eachRow((row, rowNumber) => {
        // ข้ามบรรทัดที่ 1 (หัวตาราง) ให้เริ่มอ่านเฉพาะบรรทัดที่ 2 เป็นต้นไป
        if (rowNumber > 1) {
          // ดึง "รหัสสินค้า" จากคอลัมน์ A (1) พร้อมตัดช่องว่างหน้า-หลัง (.trim)
          const woodCode = row.getCell(1).value?.toString().trim();
          // ดึง "ราคาขาย" จากคอลัมน์ C (3) แล้วแปลงเป็นตัวเลขทศนิยม (Float)
          const unitPrice = parseFloat(row.getCell(3).value);

          // เช็คว่า มีรหัสสินค้า และ ราคาต้องเป็นตัวเลขจริงๆ (!isNaN)
          if (woodCode && !isNaN(unitPrice)) {
            // *** หัวใจสำคัญ *** เอาข้อมูลมาเรียงกันเป็น Array ชุดละ 3 ตัว: [ราคา, สาขา, รหัสสินค้า]
            // สังเกตว่าเรายัด branchId ที่ได้จากหน้าเว็บ ประกบติดไปกับสินค้าทุกบรรทัดเลย!
            updates.push([unitPrice, branchId, woodCode]);
          }
        }
      });

      // ถ้าวนลูปจบแล้ว พบว่าไฟล์ว่างเปล่า ไม่มีข้อมูลเลย ก็แจ้ง Error กลับไป
      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลที่สามารถอัปเดตได้ในไฟล์ Excel' });
      }

      // ส่ง Array `updates` ไปให้ฟังก์ชันใน Database จัดการอัปเดต แล้วรอรับ "จำนวนแถว" ที่อัปเดตสำเร็จ
      const updatedCount = await WoodPriceModel.updatePricesByCodes(branchId, updates);

      // ส่งผลลัพธ์แจ้งหน้าเว็บว่าอัปโหลดและอัปเดตสำเร็จ พร้อมบอกจำนวนที่ทำได้
      res.json({ success: true, message: 'อัปโหลดสำเร็จ', updated_count: updatedCount });

    } catch (error) {
      // ถ้าพังระหว่างทาง (เช่น ไฟล์พัง) ให้ล็อก Error และแจ้งเตือน
      console.error('Import excel error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอ่าน/บันทึกไฟล์ Excel' });
    }
  }
};

module.exports = woodPriceController;