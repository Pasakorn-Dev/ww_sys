const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/production-cover', verifyToken, reportController.getProductionCover);
router.get('/wood-type-ab', verifyToken, reportController.getAbWoodReport);

// === เพิ่ม 2 บรรทัดนี้ สำหรับ PDF และ Excel ===
router.get('/wood-type-ab/pdf', verifyToken, reportController.exportAbWoodReportPDF);
router.get('/wood-type-ab/excel', verifyToken, reportController.exportAbWoodReportExcel);

module.exports = router;