const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authController = {
    // API สำหรับสร้างผู้ใช้งานใหม่ (Register)
    register: async (req, res) => {
        try {
            const { username, password, fullname, group_id, branch_id, dept_id } = req.body;
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = await UserModel.createUser({
                username, password: hashedPassword, fullname, group_id, branch_id, dept_id
            });
            
            res.status(201).json({ success: true, message: 'สร้างผู้ใช้งานสำเร็จ', data: newUser });
        } catch (error) {
            console.error(error);
            if (error.code === '23505') {
                return res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้งาน (Username) นี้ในระบบแล้ว' });
            }
            res.status(500).json({ success: false, message: 'ไม่สามารถสร้างผู้ใช้งานได้' });
        }
    },

    // API สำหรับให้ Admin สร้างผู้ใช้งานใหม่
    createUserAdmin: async (req, res) => {
        try {
            const { username, password, fullname, group_id, branch_id, dept_id, allowed_branches } = req.body;

            // Basic Validation
            if (!username || !password || !fullname || !group_id || !branch_id) {
                return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
            }

            // Hashing รหัสผ่าน
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // ส่งให้ Model จัดการ Transaction
            const newUser = await UserModel.createUserAdmin({
                username, 
                password: hashedPassword, 
                fullname, 
                group_id, 
                branch_id, 
                dept_id,
                allowed_branches // Array ของรหัสสาขาเพิ่มเติม
            });
            
            res.status(201).json({ success: true, message: 'เพิ่มผู้ใช้งานและกำหนดสิทธิ์สาขาสำเร็จ', data: newUser });

        } catch (error) {
            console.error('Create User Admin Error:', error);
            // ดักจับ Error กรณี Username ซ้ำในฐานข้อมูล
            if (error.code === '23505') {
                return res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้งาน (Username) นี้ในระบบแล้ว' });
            }
            res.status(500).json({ success: false, message: 'ไม่สามารถสร้างผู้ใช้งานได้ เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
        }
    },

    // API สำหรับให้ Admin แก้ไขข้อมูลผู้ใช้งาน
    updateUserAdmin: async (req, res) => {
        try {
            const userId = req.params.id; // รับ ID จาก URL
            const { username, password, fullname, group_id, branch_id, dept_id, allowed_branches } = req.body;

            // Basic Validation
            if (!username || !fullname || !group_id || !branch_id) {
                return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
            }

            // Hashing รหัสผ่าน (เฉพาะเมื่อมีการพิมพ์รหัสผ่านใหม่เข้ามา)
            let hashedPassword = null;
            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }

            // ส่งข้อมูลให้ Model
            const updatedUser = await UserModel.updateUserAdmin(userId, {
                username, 
                password: hashedPassword, // ถ้าเป็น null Model จะข้ามการอัปเดตรหัสผ่าน
                fullname, 
                group_id: Number(group_id), 
                branch_id: Number(branch_id), 
                dept_id: dept_id ? Number(dept_id) : null,
                allowed_branches
            });
            
            res.json({ success: true, message: 'แก้ไขข้อมูลผู้ใช้งานและสิทธิ์สาขาสำเร็จ', data: updatedUser });

        } catch (error) {
            console.error('Update User Admin Error:', error);
            // ดักจับ Error Code กรณีแก้ Username ไปซ้ำกับคนอื่น
            if (error.code === '23505') {
                return res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้งาน (Username) นี้ในระบบแล้ว' });
            }
            res.status(500).json({ success: false, message: 'Server Error: ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้' });
        }
    },

    // src/controllers/authController.js
    // ... ภายใน object authController
    getUserInfo: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
            }
            res.json({ success: true, data: user });
        } catch (error) {
            console.error('Get User Info Error:', error);
            res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' });
        }
    },

    getAllUsers: async (req, res) => {
      try {
          const users = await UserModel.getAllUsersAdmin();
          res.json({ success: true, data: users });
      } catch (error) {
          res.status(500).json({ success: false, message: 'Server Error' });
      }
    },

    deleteUserAdmin: async (req, res) => {
        try {
            const userId = req.params.id;
            const deleted = await UserModel.deleteUserAdmin(userId);
            if (!deleted) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
            res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'ไม่สามารถลบผู้ใช้นี้ได้ อาจมีข้อมูลเชื่อมโยงอยู่' });
        }
    },
    // API สำหรับเข้าสู่ระบบ (Login)
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const db = require('../config/db');
            
            // 1. ค้นหา User ในระบบ
            const user = await UserModel.findByUsername(username);
            if (!user) {
                return res.status(401).json({ success: false, message: 'ไม่พบชื่อผู้ใช้งานนี้' });
            }

            // 2. ตรวจสอบรหัสผ่านว่าตรงกันไหม
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
            }

            // 3. สร้าง JWT Token (ไม่ต้องดึง access_level ตอน login เพราะแยกตามเมนู)
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    branch_id: user.branch_id,
                    group_id: user.group_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '1d' } 
            );

            // Debug log
            // console.log('=== Login Debug Info ===');
            // console.log('Username:', user.username);
            // console.log('Branch ID:', user.branch_id);
            // console.log('Group ID:', user.group_id);
            // console.log('Note: access_level จะดึงแยกตามเมนูแต่ละครั้ง');

            res.json({ 
                success: true, 
                message: 'เข้าสู่ระบบสำเร็จ', 
                token, 
                data: { 
                    id: user.id, 
                    username: user.username, 
                    fullname: user.fullname,
                    branch_id: user.branch_id,
                    branch_name: user.branch_name,
                    group_id: user.group_id
                } 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};

module.exports = authController;