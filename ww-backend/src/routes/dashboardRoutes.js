const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/summary', verifyToken, dashboardController.getDashboardSummary);

module.exports = router;