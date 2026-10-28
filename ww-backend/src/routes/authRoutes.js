const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

// จำกัดการเดารหัสผ่าน: 10 ครั้ง / 15 นาที / IP (นับเฉพาะครั้งที่ล้มเหลว)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที' },
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.me);

// ⚠️ เดิมเป็น public (ใครก็สร้าง user/admin ได้) → ตอนนี้เฉพาะ Admin ที่ล็อกอินแล้ว
router.post('/register', verifyToken, requireAdmin, authController.register);

// Route ใหม่ สำหรับ Admin จัดการ User (ต้องล็อกอินและมีสิทธิ์ 'add' ในหน้าจัดการผู้ใช้)
router.post(
    '/manage/create', 
    verifyToken, 
    checkPermission('/manage/users', 'add'), 
    authController.createUserAdmin
);

// Route ใหม่: การแก้ไขข้อมูล User (ส่ง ID ไปทาง URL parameter)
router.put(
    '/manage/update/:id', 
    verifyToken, 
    checkPermission('/manage/users', 'edit'), 
    authController.updateUserAdmin
);

router.get(
    '/manage/user/:id', 
    verifyToken, 
    checkPermission('/manage/users', 'edit'), 
    authController.getUserInfo
);

router.get('/manage/users', verifyToken, checkPermission('/manage/users', 'view'), authController.getAllUsers);
router.delete('/manage/delete/:id', verifyToken, checkPermission('/manage/users', 'delete'), authController.deleteUserAdmin);

module.exports = router;
