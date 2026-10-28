const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');
const { branchScope } = require('../middlewares/branchScope');

// ทุก report ต้อง: 1) ล็อกอิน 2) มีสิทธิ์ view ของเมนูนั้น 3) branch_id ต้องอยู่ในสาขาที่ user มีสิทธิ์
// (link ของเมนูต้องตรงกับ path ในตาราง public.menus / App.jsx)
const guard = (menuLink) => [verifyToken, checkPermission(menuLink, 'view'), branchScope()];

router.get('/production-cover', ...guard('/production-cover'), reportController.getProductionCover);
// 💡 เพิ่มบรรทัดนี้สำหรับรูปแบบที่ 2
router.get('/production-cover-format2', ...guard('/production-cover'), reportController.getProductionCoverFormat2);

// === เพิ่ม 2 บรรทัดนี้ สำหรับ PDF และ Excel ===
router.get('/wood-type-ab', ...guard('/wood-type-ab'), reportController.getAbWoodReport);
router.get('/wood-type-ab/pdf', ...guard('/wood-type-ab'), reportController.exportAbWoodReportPDF);
router.get('/wood-type-ab/excel', ...guard('/wood-type-ab'), reportController.exportAbWoodReportExcel);

router.get('/average-price', ...guard('/average-price'), reportController.getAveragePriceReport);
// === เพิ่ม 2 บรรทัดนี้ สำหรับ PDF และ Excel ===
router.get('/average-price/pdf', ...guard('/average-price'), reportController.exportAveragePriceReportPDF);
router.get('/average-price/excel', ...guard('/average-price'), reportController.exportAveragePriceReportExcel);

router.get('/production-thick-mil', ...guard('/production-thick-mil-report'), reportController.getProductionThickMil);

router.get('/production-thick-mil/pdf', ...guard('/production-thick-mil-report'), reportController.exportProductionThickMilPDF);
router.get('/production-thick-mil/excel', ...guard('/production-thick-mil-report'), reportController.exportProductionThickMilExcel);

router.get('/sawer-performance', ...guard('/sawer-performance'), reportController.getSawerPerformance);
router.get('/sawer-performance/pdf', ...guard('/sawer-performance'), reportController.exportSawerPerformancePDF);
router.get('/sawer-performance/excel', ...guard('/sawer-performance'), reportController.exportSawerPerformanceExcel);

router.get('/daily-production', ...guard('/daily-production'), reportController.getDailyProduction);
router.get('/daily-production/pdf', ...guard('/daily-production'), reportController.exportDailyProductionPDF);
router.get('/daily-production/excel', ...guard('/daily-production'), reportController.exportDailyProductionExcel);

router.get('/sawer-performance-length', ...guard('/sawer-performance-length'), reportController.getSawerPerformanceByLength);
router.get('/sawer-performance-length/pdf', ...guard('/sawer-performance-length'), reportController.exportSawerPerformanceLengthPDF);
router.get('/sawer-performance-length/excel', ...guard('/sawer-performance-length'), reportController.exportSawerPerformanceLengthExcel);

router.get('/wet-wood-cover', ...guard('/wet-wood-cover'), reportController.getWetWoodCover);
router.get('/wet-wood-cover-format2', ...guard('/wet-wood-cover'), reportController.getWetWoodCoverFormat2);
router.get('/wet-wood-cover/pdf', ...guard('/wet-wood-cover'), reportController.exportWetWoodCoverPDF);
router.get('/wet-wood-cover/excel', ...guard('/wet-wood-cover'), reportController.exportWetWoodCoverExcel);

router.get('/dry-wood-cover', ...guard('/dry-wood-cover'), reportController.getDryWoodCover);
router.get('/dry-wood-cover-format2', ...guard('/dry-wood-cover'), reportController.getDryWoodCoverFormat2);
router.get('/dry-wood-cover/pdf', ...guard('/dry-wood-cover'), reportController.exportDryWoodCoverPDF);
router.get('/dry-wood-cover/excel', ...guard('/dry-wood-cover'), reportController.exportDryWoodCoverExcel);

// รายงานสรุปค่าแรงจัดเรียงไม้เปียก แยกรายคน
router.get('/wet-wood-perf', ...guard('/wet-wood-perf'), reportController.getWetWoodPerformance);
router.get('/wet-wood-perf/pdf', ...guard('/wet-wood-perf'), reportController.exportWetWoodPerfPDF);
router.get('/wet-wood-perf/excel', ...guard('/wet-wood-perf'), reportController.exportWetWoodPerfExcel);

// รายงานสรุปค่าแรงจัดเรียงไม้แห้ง แยกรายคน
router.get('/dry-wood-perf', ...guard('/dry-wood-perf'), reportController.getDryWoodPerformance);
router.get('/dry-wood-perf/pdf', ...guard('/dry-wood-perf'), reportController.exportDryWoodPerfPDF);
router.get('/dry-wood-perf/excel', ...guard('/dry-wood-perf'), reportController.exportDryWoodPerfExcel);

module.exports = router;
