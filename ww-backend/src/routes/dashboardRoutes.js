const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const verifyToken = require('../middlewares/authMiddleware');
const { branchScope } = require('../middlewares/branchScope');

router.get('/summary', verifyToken, branchScope({ required: false, defaultToPrimary: true, useMenuLevel: false }), dashboardController.getDashboardSummary);

module.exports = router;
