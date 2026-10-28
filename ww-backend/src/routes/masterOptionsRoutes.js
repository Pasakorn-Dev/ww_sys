const express = require('express');
const router = express.Router();
const masterOptionsController = require('../controllers/masterOptionsController');
const verifyToken = require('../middlewares/authMiddleware');
const { branchScope } = require('../middlewares/branchScope');

// ดึงข้อมูลตัวเลือก (Dropdowns) ทั้งหมดตามสาขา
router.get('/', verifyToken, branchScope({ useMenuLevel: false }), masterOptionsController.getOptions);

module.exports = router;
