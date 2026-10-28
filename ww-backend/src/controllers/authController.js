const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { setAuthCookie, clearAuthCookie, JWT_EXPIRES_IN } = require('../utils/authCookie');

// hash หลอก ใช้เปรียบเทียบตอนไม่พบ username เพื่อให้เวลาตอบสนองใกล้เคียงกัน (กัน username enumeration จาก timing)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10) // ใช้ cost เท่ากับ hash เดิมในระบบ (10);
const BCRYPT_ROUNDS = 12;

const publicUser = (user) => ({
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    branch_id: user.branch_id,
    branch_name: user.branch_name,
    group_id: user.group_id,
});

const authController = {
    // สร้างผู้ใช้ใหม่ — route นี้ต้องผ่าน verifyToken + requireAdmin (ดู authRoutes.js)
    register: async (req, res) => {
        try {
            const { username, password, fullname, group_id, branch_id, dept_id } = req.body || {};

            if (typeof username !== 'string' || username.trim().length < 3 || username.length > 50) {
                return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้ต้องมี 3-50 ตัวอักษร' });
            }
            if (typeof password !== 'string' || password.length < 10 || password.length > 72) {
                // bcrypt ใช้ได้สูงสุด 72 bytes
                return res.status(400).json({ success: false, message: 'รหัสผ่านต้องยาว 10-72 ตัวอักษร' });
            }

            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

            const newUser = await UserModel.createUser({
                username: username.trim(), password: hashedPassword, fullname, group_id, branch_id, dept_id,
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

    login: async (req, res) => {
        try {
            const { username, password } = req.body || {};

            // กัน NoSQL/type confusion และ input ผิดรูป
            if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || password.length > 72) {
                return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
            }

            const user = await UserModel.findByUsername(username);

            // เปรียบเทียบ hash เสมอ แม้ไม่พบผู้ใช้ (กัน timing attack) และใช้ข้อความเดียวกัน (กัน username enumeration)
            const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
            if (!user || !isMatch) {
                console.warn(`[Auth] login failed username="${String(username).slice(0, 50)}" ip=${req.ip}`);
                return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
            }

            // payload เล็กที่สุด — สิทธิ์/สาขา/กลุ่ม ให้ดึงสดจาก DB ทุก request (เปลี่ยนสิทธิ์แล้วมีผลทันที)
            const token = jwt.sign(
                { id: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
            );

            setAuthCookie(res, token);

            // ไม่ส่ง token กลับใน body อีกต่อไป
            res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', data: publicUser(user) });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // ตรวจ session ปัจจุบัน + ดึงข้อมูลผู้ใช้สดจาก DB (frontend ใช้แทนการอ่านจาก localStorage)
    me: async (req, res) => {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) {
                clearAuthCookie(res);
                return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
            }
            res.json({ success: true, data: publicUser(user) });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
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

    logout: (req, res) => {
        clearAuthCookie(res);
        res.json({ success: true, message: 'ออกจากระบบแล้ว' });
    },
};

module.exports = authController;
