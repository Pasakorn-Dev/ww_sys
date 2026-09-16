const BranchModel = require('../models/branchModel');

const branchController = {
    getBranches: async (req, res) => {
        try {
            const branches = await BranchModel.getAllBranches();
            res.json({ success: true, data: branches });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    addBranch: async (req, res) => {
        try {
            const newBranch = await BranchModel.createBranch(req.body);
            res.status(201).json({ success: true, message: 'เพิ่มสาขาสำเร็จ', data: newBranch });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'ไม่สามารถเพิ่มสาขาได้ ข้อมูลอาจซ้ำหรือผิดพลาด' });
        }
    },

    updateBranch: async (req, res) => {
        try {
            const updatedBranch = await BranchModel.updateBranch(req.params.id, req.body);
            if (!updatedBranch) return res.status(404).json({ success: false, message: 'ไม่พบสาขานี้' });
            res.json({ success: true, message: 'แก้ไขสาขาสำเร็จ', data: updatedBranch });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'ไม่สามารถแก้ไขสาขาได้' });
        }
    },

    deleteBranch: async (req, res) => {
        try {
            const deleted = await BranchModel.deleteBranch(req.params.id);
            if (!deleted) return res.status(404).json({ success: false, message: 'ไม่พบสาขานี้' });
            res.json({ success: true, message: 'ลบสาขาสำเร็จ' });
        } catch (error) {
            console.error(error);
            // เช็ค Error กรณีมีข้อมูลผูกอยู่ (เช่น มีพนักงานอยู่สาขานี้แล้วห้ามลบ)
            if (error.code === '23503') {
                return res.status(400).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานสาขานี้อยู่' });
            }
            res.status(500).json({ success: false, message: 'ไม่สามารถลบสาขาได้' });
        }
    },

    // ดึงสาขาตามสิทธิ์ Access Level
    getAllowedBranches: async (req, res) => {
        try {
            // 1. ดึงข้อมูล User จาก Token / Middleware
            const userId = req.user.id;
            const primaryBranchId = req.user.branch_id;
            const accessLevel = Number(req.user.access_level || 3);

            // 2. เรียกใช้งาน Model ให้ไปดึงข้อมูลมาให้
            const branches = await BranchModel.getAllowedBranches(userId, primaryBranchId, accessLevel);
            
            // 3. ส่งข้อมูลกลับไปให้ Frontend
            res.json({ success: true, access_level: accessLevel, data: branches });
            
        } catch (error) {
            console.error('Error fetching allowed branches:', error);
            res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสาขาตามสิทธิ์ได้' });
        }
    }
};

module.exports = branchController;