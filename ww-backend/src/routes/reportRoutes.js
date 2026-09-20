const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/production-cover', verifyToken, reportController.getProductionCover);
router.get('/wood-type-ab', verifyToken, reportController.getAbWoodReport);

module.exports = router;