const cron = require('node-cron');
const masterController = require('./controllers/masterController');
const transactionController = require('./controllers/transactionController');

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

// ─── Cron: ซิงค์ข้อมูล Transaction ทุกสาขาอัตโนมัติ ───
const runAutoSyncTransactions = async (label, syncFn) => {
    console.log(`[Cron] ⏳ เริ่มซิงค์${label}อัตโนมัติ: ${new Date().toLocaleString('th-TH')}`);
    try {
        const results = await syncFn();
        const totalAll = results.reduce((sum, r) => sum + r.total_synced, 0);
        const failCount = results.filter(r => r.status === 'error').length;
        console.log(`[Cron] 🏁 ซิงค์${label}เสร็จ: รวม ${totalAll} รายการ, สำเร็จ ${results.length - failCount}/${results.length} สาขา`);
    } catch (error) {
        console.error(`[Cron] ❌ ซิงค์${label}ผิดพลาด:`, error);
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

// ตั้งเวลาซิงค์ไม้เลื่อยทุกสาขา: ตี 3 ของทุกวัน (หลังซิงค์ Master 1 ชม.)
cron.schedule('0 3 * * *', () => {
    runAutoSyncTransactions('ไม้เลื่อย', transactionController.cronSyncSawWoods);
}, {
    scheduled: true,
    timezone: "Asia/Bangkok"
});

// ตั้งเวลาซิงค์ไม้เปียกทุกสาขา: ตี 3 ครึ่ง ของทุกวัน (หลังซิงค์ไม้เลื่อย 30 นาที)
cron.schedule('30 3 * * *', () => {
    runAutoSyncTransactions('ไม้เปียก', transactionController.cronSyncWetWoods);
}, {
    scheduled: true,
    timezone: "Asia/Bangkok"
});

// ตั้งเวลาซิงค์ไม้แห้งทุกสาขา: ตี 4 ของทุกวัน (หลังซิงค์ไม้เปียก 30 นาที)
cron.schedule('0 4 * * *', () => {
    runAutoSyncTransactions('ไม้แห้ง', transactionController.cronSyncDryWoods);
}, {
    scheduled: true,
    timezone: "Asia/Bangkok"
});

console.log('✅ ระบบ Auto-Sync ตั้งเวลาทำงานอัตโนมัติ (ตี 2 Master, ตี 3 ไม้เลื่อย, ตี 3:30 ไม้เปียก, ตี 4 ไม้แห้ง) พร้อมทำงานแล้ว');

// เพิ่มบรรทัดนี้เพื่อบังคับให้มันทำงานทันที 1 รอบตอนที่ Server Start
runAutoSync();

module.exports = cron;