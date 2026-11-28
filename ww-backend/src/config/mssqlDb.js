const sql = require('mssql');
require('dotenv').config();

let mssqlPool = null;

/**
 * สร้างและคืนค่า Connection Pool สำหรับเชื่อมต่อ SQL Server (ระบบ HR / พนักงาน)
 */
const getMssqlConnection = async () => {
    if (mssqlPool && mssqlPool.connected) {
        return mssqlPool;
    }

    const server = process.env.MSSQL_HOST;
    const user = process.env.MSSQL_USER;
    const password = process.env.MSSQL_PASSWORD;
    const database = process.env.MSSQL_DB;
    const port = Number(process.env.MSSQL_PORT || 1433);

    if (!server || !user || !password || !database) {
        throw new Error(
            'ไม่พบการตั้งค่าเชื่อมต่อ SQL Server (โปรดตรวจสอบ MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DB ในไฟล์ .env)'
        );
    }

    const config = {
        server,
        port,
        user,
        password,
        database,
        options: {
            encrypt: process.env.MSSQL_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT !== 'false',
        },
        pool: {
            max: 5,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };

    mssqlPool = await new sql.ConnectionPool(config).connect();
    mssqlPool.on('error', (err) => {
        console.error('[MSSQL] Pool error:', err);
        mssqlPool = null;
    });

    return mssqlPool;
};

module.exports = { getMssqlConnection, sql };
