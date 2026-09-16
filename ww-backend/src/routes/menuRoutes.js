const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const verifyToken = require('../middlewares/authMiddleware');

// ต้องมี Token (เข้าสู่ระบบแล้ว) ถึงจะดึงเมนูของตัวเองได้
router.get('/', verifyToken, menuController.getUserMenus);

module.exports = router;