const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

router.use(verifyToken);

// ตรวจสอบสิทธิ์ตามประเภท action
router.get('/', productController.getAllProducts);
router.post('/', checkPermission('/products', 'add'), productController.createProduct);
router.put('/:id', checkPermission('/products', 'edit'), productController.updateProduct);
router.delete('/:id', checkPermission('/products', 'delete'), productController.deleteProduct);

// API ราคาสาขา - ตรวจสอบสิทธิ์ด้วย
router.get('/:id/branch-prices', checkPermission('/products', 'view'), productController.getProductBranchPrices);
router.post('/:id/branch-prices', checkPermission('/products', 'edit'), productController.saveProductBranchPrices);

module.exports = router;