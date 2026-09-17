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
      const { branch_id } = req.query;
      if (!branch_id) return res.status(400).send('กรุณาระบุสาขา');

      // นำ Model เดิมมา Reuse ใช้ดึงข้อมูลใส่ Excel
      const rows = await WoodPriceModel.getWoodPrices({ branch_id });

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
      res.setHeader('Content-Disposition', `attachment; filename=WoodPrice_Branch_${branch_id}.xlsx`);

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
      const branchId = req.body.branch_id;
      const file = req.file;

      if (!branchId || !file) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน (ไฟล์ หรือ สาขา)' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer); 
      const worksheet = workbook.getWorksheet(1);

      const updates = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const woodCode = row.getCell(1).value?.toString().trim();
          const unitPrice = parseFloat(row.getCell(3).value);

          if (woodCode && !isNaN(unitPrice)) {
            updates.push([unitPrice, branchId, woodCode]);
          }
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลที่สามารถอัปเดตได้ในไฟล์ Excel' });
      }

      // ส่ง Array ไปให้ Model อัปเดตฐานข้อมูลให้
      const updatedCount = await WoodPriceModel.updatePricesByCodes(branchId, updates);

      res.json({ success: true, message: 'อัปโหลดสำเร็จ', updated_count: updatedCount });

    } catch (error) {
      console.error('Import excel error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอ่าน/บันทึกไฟล์ Excel' });
    }
  }
};

module.exports = woodPriceController;