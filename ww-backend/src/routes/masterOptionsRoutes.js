const express = require('express');
const router = express.Router();
const masterOptionsController = require('../controllers/masterOptionsController');
const verifyToken = require('../middlewares/authMiddleware');

// ดึงข้อมูลตัวเลือก (Dropdowns) ทั้งหมดตามสาขา
router.get('/', verifyToken, masterOptionsController.getOptions);

module.exports = router;