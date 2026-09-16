const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const verifyToken = require('../middlewares/authMiddleware'); // เพิ่มการเรียกใช้ Middleware
const checkPermission = require('../middlewares/permissionMiddleware'); // นำเข้า Middleware

// อ่านข้อมูล (ใส่แค่ verifyToken เพราะแค่ล็อกอินก็ควรดึงรายการได้ หรือจะเช็ค 'view' ก็ได้)
router.get('/', verifyToken, branchController.getBranches);

// เพิ่มข้อมูล (ต้องมีสิทธิ์ add)
router.post('/', verifyToken, checkPermission('/branches', 'add'), branchController.addBranch);

// แก้ไขข้อมูล (ต้องมีสิทธิ์ edit)
router.put('/:id', verifyToken, checkPermission('/branches', 'edit'), branchController.updateBranch);

// ลบข้อมูล (ต้องมีสิทธิ์ delete)
router.delete('/:id', verifyToken, checkPermission('/branches', 'delete'), branchController.deleteBranch);

module.exports = router;