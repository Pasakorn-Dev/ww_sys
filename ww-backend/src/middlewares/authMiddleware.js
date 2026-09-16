// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // 1. ดึง Token จาก Header ในช่อง Authorization
    const authHeader = req.headers['authorization'];
    
    // รูปแบบที่ส่งมาจะเป็น "Bearer <token>" เราจึงต้อง split เพื่อเอาเฉพาะตัว <token>
    const token = authHeader && authHeader.split(' ')[1];

    // 2. ถ้าไม่มี Token ส่งมา ให้ปฏิเสธการเข้าถึง
    if (!token) {
        return res.status(401).json({ success: false, message: 'ปฏิเสธการเข้าถึง กรุณาเข้าสู่ระบบ (No Token)' });
    }

    try {
        // 3. ตรวจสอบความถูกต้องของ Token ด้วย JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. นำข้อมูล user ที่แกะได้จาก Token (เช่น id, username, branch_id) ไปแนบไว้กับ req
        req.user = decoded; 
        
        // 5. ให้ทำงานในคำสั่งถัดไปได้ (ผ่านด่าน)
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
};

module.exports = verifyToken;