const express = require('express');
const router = express.Router();
const masterOptionsController = require('../controllers/masterOptionsController');
const verifyToken = require('../middlewares/authMiddleware');

// ดึงข้อมูลตัวเลือก (Dropdowns) ทั้งหมดตามสาขา
router.get('/', verifyToken, masterOptionsController.getOptions);

// เพิ่ม Route ใหม่สำหรับดึงกลุ่มและแผนก
router.get('/groups', verifyToken, masterOptionsController.getGroups);
router.get('/departments', verifyToken, masterOptionsController.getDepartments);

module.exports = router;