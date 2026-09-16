const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// ทดสอบการเชื่อมต่อ
pool.connect((err, client, release) => {
    if (err) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ Database:', err.stack);
    } else {
        console.log('เชื่อมต่อฐานข้อมูล PostgreSQL สำเร็จแล้ว!');
    }
    if (client) release();
});

module.exports = pool;