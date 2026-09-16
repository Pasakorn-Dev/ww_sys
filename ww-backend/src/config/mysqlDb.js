const mysql = require('mysql2/promise');
require('dotenv').config();

// สร้าง Cache เก็บ Pool ของแต่ละสาขาไว้
const pools = {};

const getMysqlConnection = async (branchId) => {
    // 1. ถ้ามี Pool ของสาขานี้แล้ว ให้ใช้ของเดิม
    if (pools[branchId]) {
        return pools[branchId];
    }

    // 2. 🌟 หัวใจสำคัญ: ดึง IP และ Password ตามเลขสาขา (เช่น MYSQL_HOST_1, MYSQL_HOST_2)
    const host = process.env[`MYSQL_HOST_${branchId}`];
    const user = process.env[`MYSQL_USER_${branchId}`];
    const password = process.env[`MYSQL_PASSWORD_${branchId}`];
    const database = process.env[`MYSQL_DB_${branchId}`];

    // 3. ดักจับ Error ถ้าลืมตั้งค่า .env ของสาขานั้นๆ
    if (!host) {
        throw new Error(`ไม่พบการตั้งค่าเชื่อมต่อ MySQL สำหรับสาขาที่ ${branchId} (โปรดตรวจสอบ MYSQL_HOST_${branchId} ในไฟล์ .env)`);
    }

    // 4. สร้างการเชื่อมต่อใหม่และเก็บเข้า Cache
    const pool = mysql.createPool({
        host,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 5,
    });

    pools[branchId] = pool;
    return pool;
};

module.exports = { getMysqlConnection };