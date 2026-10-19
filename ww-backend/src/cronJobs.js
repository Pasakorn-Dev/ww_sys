const cron = require('node-cron');
const masterController = require('./controllers/masterController');

// จำลองระบบหลอกว่ามี Request/Response เพื่อสั่งให้ Controller ทำงาน
const runAutoSync = async () => {
    console.log(`[Cron] ⏳ เริ่มกระบวนการซิงค์ข้อมูลอัตโนมัติ: ${new Date().toLocaleString('th-TH')}`);
    
    // จำลอง Request ให้ branch_id = 0 (แปลว่าสั่งอัปเดตทุกสาขา)
    const mockReq = { body: { branch_id: 0 } };
    
    // จำลอง Response เพื่อรับผลลัพธ์จาก Controller กลับมาพิมพ์ใน Log
    const mockRes = {
        status: function(code) {
            return this; // ให้ Chain .json() ต่อได้
        },
        json: function(data) {
            console.log(`[Cron] 🏁 ผลลัพธ์: ${data.message} (ใช้เวลา ${data.sync_time} วิ)`);
        }
    };

    try {
        await masterController.syncMasterData(mockReq, mockRes);
    } catch (error) {
        console.error('[Cron] ❌ เกิดข้อผิดพลาดร้ายแรง:', error);
    }
};

// ----------------------------------------------------
// ตั้งเวลาทำงาน: ตัวอย่างตั้งไว้ที่ 02:00 น. (ตี 2 ของทุกวัน)
// ----------------------------------------------------
// รูปแบบ: 'นาที ชั่วโมง วันที่ เดือน วันในสัปดาห์'
cron.schedule('0 2 * * *', () => {
    runAutoSync();
}, {
    scheduled: true,
    timezone: "Asia/Bangkok" // บังคับให้เป็นโซนเวลาประเทศไทยเสมอ
});

console.log('✅ ระบบ Auto-Sync ตั้งเวลาทำงานอัตโนมัติ (ตี 2 ทุกวัน) พร้อมทำงานแล้ว');

// เพิ่มบรรทัดนี้เพื่อบังคับให้มันทำงานทันที 1 รอบตอนที่ Server Start
runAutoSync();

module.exports = cron;