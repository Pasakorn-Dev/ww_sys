const express = require('express');
const router = express.Router();
const multer = require('multer'); // <--- เพิ่มตรงนี้
const masterController = require('../controllers/masterController');
const woodPriceController = require('../controllers/woodPriceController'); // <--- เพิ่มตรงนี้
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware'); // นำเข้า Middleware เช็คสิทธิ์
const { branchScope } = require('../middlewares/branchScope');

// ตั้งค่า Multer ให้อ่านไฟล์เก็บไว้ใน Memory Buffer (ไม่เซฟลง Harddisk ให้รกเซิร์ฟเวอร์)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // จำกัด 5MB / 1 ไฟล์
    fileFilter: (req, file, cb) => {
        const okExt = /\.xlsx$/i.test(file.originalname);
        const okMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        okExt && okMime ? cb(null, true) : cb(new Error('รองรับเฉพาะไฟล์ .xlsx'));
    },
});

// ทุกเส้นทางต้องผ่านการตรวจสอบ Token (Security)
// router.get('/categories', verifyToken, masterController.getCategories);
// router.get('/suppliers', verifyToken, masterController.getSuppliers);
// router.get('/units', verifyToken, masterController.getUnits);

// เพิ่ม API ยิงคำสั่ง Sync ข้อมูล (เช็คสิทธิ์แอดมินหรือคนที่มีสิทธิ์กดเพิ่มข้อมูล)
router.post('/sync', verifyToken, checkPermission('/sync-master', 'add'), branchScope({ allowAll: true }), masterController.syncMasterData);

// ========================================================
// 🪵 API สำหรับระบบจัดการราคาไม้เลื่อย (Wood Price Manager)
// ========================================================
// 1. ดึงรายการสินค้าและราคา (อ่านข้อมูล)
router.get('/wood-prices', verifyToken, checkPermission('/wood-prices', 'view'), branchScope(), woodPriceController.getPrices);

// 2. บันทึกราคาจากการแก้ในหน้าเว็บ (Bulk Update)
router.put('/wood-prices/bulk-update', verifyToken, checkPermission('/wood-prices', 'edit'), branchScope({ required: false }), woodPriceController.bulkUpdate);

// 3. ดาวน์โหลด (Export) Excel (ใช้สิทธิ์แค่ View ก็โหลดแม่แบบไปดูได้)
router.get('/wood-prices/export', verifyToken, checkPermission('/wood-prices', 'view'), branchScope(), woodPriceController.exportExcel); 
// ใช้ cookie ยืนยันตัวตน จึงเปิดด้วย window.open ได้โดยไม่ต้องส่ง token ผ่าน URL

// 4. นำเข้า (Import) Excel
router.post('/wood-prices/import', verifyToken, checkPermission('/wood-prices', 'edit'), upload.single('file'), branchScope(), woodPriceController.importExcel);

module.exports = router;
