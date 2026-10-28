// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

// Route เดิม
router.post('/register', authController.register);
router.post('/login', authController.login);

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