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
  }
};

module.exports = reportController;