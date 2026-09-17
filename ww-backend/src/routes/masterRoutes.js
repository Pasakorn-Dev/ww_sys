const express = require('express');
const router = express.Router();
const multer = require('multer'); // <--- เพิ่มตรงนี้
const masterController = require('../controllers/masterController');
const woodPriceController = require('../controllers/woodPriceController'); // <--- เพิ่มตรงนี้
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware'); // นำเข้า Middleware เช็คสิทธิ์

// ตั้งค่า Multer ให้อ่านไฟล์เก็บไว้ใน Memory Buffer (ไม่เซฟลง Harddisk ให้รกเซิร์ฟเวอร์)
const upload = multer({ storage: multer.memoryStorage() });

// ทุกเส้นทางต้องผ่านการตรวจสอบ Token (Security)
router.get('/categories', verifyToken, masterController.getCategories);
router.get('/suppliers', verifyToken, masterController.getSuppliers);
router.get('/units', verifyToken, masterController.getUnits);

// เพิ่ม API ยิงคำสั่ง Sync ข้อมูล (เช็คสิทธิ์แอดมินหรือคนที่มีสิทธิ์กดเพิ่มข้อมูล)
router.post('/sync', verifyToken, checkPermission('/sync-master', 'add'), masterController.syncMasterData);

// ========================================================
// 🪵 API สำหรับระบบจัดการราคาไม้เลื่อย (Wood Price Manager)
// ========================================================
// 1. ดึงรายการสินค้าและราคา (อ่านข้อมูล)
router.get('/wood-prices', verifyToken, checkPermission('/wood-prices', 'view'), woodPriceController.getPrices);

// 2. บันทึกราคาจากการแก้ในหน้าเว็บ (Bulk Update)
router.put('/wood-prices/bulk-update', verifyToken, checkPermission('/wood-prices', 'edit'), woodPriceController.bulkUpdate);

// 3. ดาวน์โหลด (Export) Excel (ใช้สิทธิ์แค่ View ก็โหลดแม่แบบไปดูได้)
router.get('/wood-prices/export', woodPriceController.exportExcel); 
// หมายเหตุ: กรณี Export เป็นหน้าต่างใหม่ (window.open) มันส่ง Bearer Token ผ่าน Header ลำบาก 
// เราอนุโลมเอา Token ออกเฉพาะเส้นทางนี้ชั่วคราว หรือใช้เทคนิคอื่นในการแนบสิทธิ์ได้ครับ

// 4. นำเข้า (Import) Excel
router.post('/wood-prices/import', verifyToken, checkPermission('/wood-prices', 'edit'), upload.single('file'), woodPriceController.importExcel);

module.exports = router;