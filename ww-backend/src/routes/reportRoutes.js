const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/production-cover', verifyToken, reportController.getProductionCover);
// 💡 เพิ่มบรรทัดนี้สำหรับรูปแบบที่ 2
router.get('/production-cover-format2', verifyToken, reportController.getProductionCoverFormat2);

// === เพิ่ม 2 บรรทัดนี้ สำหรับ PDF และ Excel ===
router.get('/wood-type-ab', verifyToken, reportController.getAbWoodReport);
router.get('/wood-type-ab/pdf', verifyToken, reportController.exportAbWoodReportPDF);
router.get('/wood-type-ab/excel', verifyToken, reportController.exportAbWoodReportExcel);

router.get('/average-price', verifyToken, reportController.getAveragePriceReport);
// === เพิ่ม 2 บรรทัดนี้ สำหรับ PDF และ Excel ===
router.get('/average-price/pdf', verifyToken, reportController.exportAveragePriceReportPDF);
router.get('/average-price/excel', verifyToken, reportController.exportAveragePriceReportExcel);

router.get('/production-thick-mil', verifyToken, reportController.getProductionThickMil);

router.get('/production-thick-mil/pdf', verifyToken, reportController.exportProductionThickMilPDF);
router.get('/production-thick-mil/excel', verifyToken, reportController.exportProductionThickMilExcel);

router.get('/sawer-performance', verifyToken, reportController.getSawerPerformance);
router.get('/sawer-performance/pdf', verifyToken, reportController.exportSawerPerformancePDF);
router.get('/sawer-performance/excel', verifyToken, reportController.exportSawerPerformanceExcel);

router.get('/daily-production', verifyToken, reportController.getDailyProduction);
router.get('/daily-production/pdf', verifyToken, reportController.exportDailyProductionPDF);
router.get('/daily-production/excel', verifyToken, reportController.exportDailyProductionExcel);

router.get('/sawer-performance-length', verifyToken, reportController.getSawerPerformanceByLength);
router.get('/sawer-performance-length/pdf', verifyToken, reportController.exportSawerPerformanceLengthPDF);
router.get('/sawer-performance-length/excel', verifyToken, reportController.exportSawerPerformanceLengthExcel);

router.get('/wet-wood-cover', verifyToken, reportController.getWetWoodCover);
router.get('/wet-wood-cover-format2', verifyToken, reportController.getWetWoodCoverFormat2);
router.get('/wet-wood-cover/pdf', verifyToken, reportController.exportWetWoodCoverPDF);
router.get('/wet-wood-cover/excel', verifyToken, reportController.exportWetWoodCoverExcel);

router.get('/dry-wood-cover', verifyToken, reportController.getDryWoodCover);
router.get('/dry-wood-cover-format2', verifyToken, reportController.getDryWoodCoverFormat2);
router.get('/dry-wood-cover/pdf', verifyToken, reportController.exportDryWoodCoverPDF);
router.get('/dry-wood-cover/excel', verifyToken, reportController.exportDryWoodCoverExcel);

module.exports = router;