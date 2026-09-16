const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware'); // นำเข้า Middleware เช็คสิทธิ์

// ทุกเส้นทางต้องผ่านการตรวจสอบ Token (Security)
router.get('/categories', verifyToken, masterController.getCategories);
router.get('/suppliers', verifyToken, masterController.getSuppliers);
router.get('/units', verifyToken, masterController.getUnits);

// เพิ่ม API ยิงคำสั่ง Sync ข้อมูล (เช็คสิทธิ์แอดมินหรือคนที่มีสิทธิ์กดเพิ่มข้อมูล)
router.post('/sync', verifyToken, checkPermission('/sync-master', 'add'), masterController.syncMasterData);

module.exports = router;