const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

// API ซิงค์ข้อมูลเลื่อยไม้ (ต้องการสิทธิ์แอดมินหรือเพิ่มข้อมูล)
router.post('/sync-saw-woods', verifyToken, checkPermission('/sync-saw-woods', 'add'), transactionController.syncSawWoods);
// ดึงข้อมูลนับไม้เลื่อย
router.get('/saw-woods', verifyToken, checkPermission('/check-saw-woods', 'view'), transactionController.getSawWoods);

// API สำหรับการคำนวณราคาย้อนหลัง
router.post('/recalculate-prices', verifyToken, checkPermission('/recalculate-price', 'edit'), transactionController.recalculatePrices);
router.get('/recal-logs', verifyToken, transactionController.getRecalLogs);

// API ซิงค์ข้อมูลไม้เปียก (ต้องการสิทธิ์แอดมินหรือเพิ่มข้อมูล)
router.post('/sync-wet-woods', verifyToken, checkPermission('/sync-wet-woods', 'add'), transactionController.syncWetWoods);

module.exports = router;