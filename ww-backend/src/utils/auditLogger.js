// src/utils/auditLogger.js
const pool = require('../config/db'); // เรียกใช้ Database Connection ที่มีอยู่แล้ว

/**
 * ฟังก์ชันกลางสำหรับบันทึก Audit Log ลงฐานข้อมูล
 * @param {Object} params
 * @param {Object} params.req - Express Request Object (เพื่อดึง IP, User-Agent, สิทธิ์)
 * @param {String} params.module - ระบบที่เกิดเหตุ (เช่น 'SYNC_DATA', 'AUTH')
 * @param {String} params.action - การกระทำ (เช่น 'SYNC_SAW_WOOD', 'LOGIN', 'DELETE')
 * @param {Number|null} params.branch_id - รหัสสาขาที่เกิดการเปลี่ยนแปลง (ถ้ามี)
 * @param {String} params.status - 'SUCCESS', 'FAILED', หรือ 'ERROR'
 * @param {Object} params.payload - ข้อมูลที่ต้องการบันทึกเป็น JSON (เช่น ข้อมูลก่อน-หลังแก้ไข)
 * @param {String|null} params.error_message - ข้อความ Error กรณีที่พัง
 */
const saveAuditLog = async ({ req, module, action, branch_id = null, status, payload = {}, error_message = null }) => {
    try {
        // 1. ดึงข้อมูล User (สมมติว่า authMiddleware.js แนบ req.user มาให้แล้ว)[cite: 2]
        const userId = req?.user?.id || null;
        const username = req?.user?.username || 'SYSTEM / UNAUTHENTICATED';

        // 2. สกัด IP Address อย่างรัดกุม (รองรับกรณีลืมตั้ง trust proxy)
        // ลองดึงจาก X-Forwarded-For ก่อน ถ้าไม่มีค่อยใช้ req.ip หรือ remoteAddress
        const rawIp = req?.headers['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress;
        // กรณี X-Forwarded-For มีหลาย IP (ผ่าน Proxy หลายชั้น) ให้เอา IP แรกสุดที่เป็นของ Client ตัวจริง
        const ipAddress = rawIp ? rawIp.split(',')[0].trim() : null;

        // 3. สกัด User-Agent (รู้ว่าเป็น Browser หรือมือถือรุ่นไหน)
        const userAgent = req?.headers['user-agent'] || 'Unknown Agent';

        // 4. สร้างคำสั่ง SQL Insert
        const query = `
            INSERT INTO public.system_audit_logs 
            (user_id, username, module, action, branch_id, ip_address, user_agent, payload, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
            userId, 
            username, 
            module, 
            action, 
            branch_id, 
            ipAddress, 
            userAgent, 
            JSON.stringify(payload), // แปลง Object เป็น JSON Text สำหรับ JSONB Column
            status, 
            error_message
        ];
        
        // 5. โยนเข้า Database 
        await pool.query(query, values);

    } catch (error) {
        // กรณีบันทึก Log พัง (เช่น Database หลุด) 
        // เราจะไม่ throw error ไปรบกวนการทำงานหลักของระบบ (Non-blocking) แต่จะพิมพ์ลง Console ไว้
        console.error('❌ [Audit Log Failed]: ไม่สามารถบันทึก Log ได้', error);
    }
};

module.exports = { saveAuditLog };