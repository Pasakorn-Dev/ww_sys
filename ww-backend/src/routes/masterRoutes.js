const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const verifyToken = require('../middlewares/authMiddleware');

// ทุกเส้นทางต้องผ่านการตรวจสอบ Token (Security)
router.get('/categories', verifyToken, masterController.getCategories);
router.get('/suppliers', verifyToken, masterController.getSuppliers);
router.get('/units', verifyToken, masterController.getUnits);

module.exports = router;