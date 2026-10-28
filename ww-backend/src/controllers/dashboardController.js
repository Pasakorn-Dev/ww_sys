const DashboardModel = require('../models/dashboardModel');

const dashboardController = {
  getDashboardSummary: async (req, res) => {
    try {
      // ใช้ branch_id ที่ผ่านการตรวจสิทธิ์แล้วจาก branchScope (ไม่เชื่อค่าดิบจาก query)
      const branch_id = req.scope.branchId;
      // ดึงข้อมูล 7 วันย้อนหลังจาก Model เรียงจากวันที่ล่าสุด (DESC)
      const rows = await DashboardModel.getOverviewData(branch_id);
      
      // 1. จัดการข้อมูล KPI Cards (ใช้ 2 วันล่าสุด)
      let yesterday = { sawVol: 0, sawVal: 0, wetVol: 0, wetVal: 0, dryVol: 0, dryVal: 0, date: null };
      let dayBefore = { sawVol: 0, wetVol: 0, dryVol: 0 };

      if (rows.length > 0) {
        yesterday = {
          sawVol: Number(rows[0].volumn_saw || 0), sawVal: Number(rows[0].net_money_saw || 0),
          wetVol: Number(rows[0].volumn_wet || 0), wetVal: Number(rows[0].net_money_wet || 0),
          dryVol: Number(rows[0].volumn_dry || 0), dryVal: Number(rows[0].net_money_dry || 0),
          date: rows[0].produce_date
        };
      }

      if (rows.length > 1) {
        dayBefore = {
          sawVol: Number(rows[1].volumn_saw || 0),
          wetVol: Number(rows[1].volumn_wet || 0),
          dryVol: Number(rows[1].volumn_dry || 0)
        };
      }

      const calcPercent = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

      const kpiData = {
        sawWood: { vol: yesterday.sawVol, val: yesterday.sawVal, percent: calcPercent(yesterday.sawVol, dayBefore.sawVol) },
        wetWood: { vol: yesterday.wetVol, wage: yesterday.wetVal, percent: calcPercent(yesterday.wetVol, dayBefore.wetVol) },
        dryWood: { vol: yesterday.dryVol, wage: yesterday.dryVal, percent: calcPercent(yesterday.dryVol, dayBefore.dryVol) },
        lastSync: yesterday.date || 'ไม่มีข้อมูล'
      };

      // 2. จัดการข้อมูลกราฟ 7 วัน (Chart Data)
      const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
      // สลับ Array ให้เป็นจากอดีต -> ปัจจุบัน (ASC) สำหรับแสดงในกราฟ
      const chartData = rows.slice(0, 7).reverse().map(r => {
        const d = new Date(r.produce_date);
        return {
          day: daysOfWeek[d.getDay()],
          date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}`,
          saw: Number(r.volumn_saw || 0),
          wet: Number(r.volumn_wet || 0),
          dry: Number(r.volumn_dry || 0)
        };
      });

      const topPerformers = await DashboardModel.getTopPerformers(branch_id);

      res.json({ 
        success: true, 
        kpi: kpiData, 
        chart: chartData , 
        topPerformers: topPerformers
      });

    } catch (error) {
      console.error('Error Dashboard API:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = dashboardController;
