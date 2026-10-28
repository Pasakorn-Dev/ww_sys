const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const validateEnv = require('./utils/validateEnv');
validateEnv(); // ถ้า config ไม่ปลอดภัยใน production จะหยุดทันที

const csrfMiddleware = require('./middlewares/csrfMiddleware');
// require('./cronJobs'); // เปิดใช้งานระบบตั้งเวลาอัตโนมัติเบื้องหลัง

const app = express();

// ซ่อน header ที่บอกว่าใช้ Express
app.disable('x-powered-by');

// อยู่หลัง Nginx / reverse proxy → ให้ req.ip และ rate limit ใช้ IP จริงของผู้ใช้
// ปรับจำนวน proxy ได้ด้วย TRUST_PROXY (ค่าเริ่มต้น 1 ชั้น)
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Security headers (HSTS, noSniff, frameguard ฯลฯ) — API ส่ง JSON อยู่แล้วจึงตั้ง CSP แบบเข้มได้
app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS: อนุญาตเฉพาะโดเมนใน CORS_ORIGINS และต้องเปิด credentials เพื่อให้ส่ง cookie ได้
// (ถ้า FE+BE อยู่โดเมนเดียวกันผ่าน Nginx /api จะไม่ผ่าน CORS เลย)
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
if (process.env.NODE_ENV !== 'production') allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');

app.use(cors({
    origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '200kb' })); // จำกัดขนาด body กัน DoS

// Rate limit ภาพรวมทั้ง API (กัน scraping / flood) — login มี limiter เข้มกว่าใน authRoutes
app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'คำขอมากเกินไป กรุณาลองใหม่ภายหลัง' },
}));

// กัน CSRF สำหรับ POST/PUT/DELETE
app.use('/api', csrfMiddleware);

// Routes
const branchRoutes = require('./routes/branchRoutes');
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const masterRoutes = require('./routes/masterRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const masterOptionsRoutes = require('./routes/masterOptionsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/master', masterRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/master-options', masterOptionsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check (ไม่เปิดเผยรายละเอียดภายใน)
app.get('/api/status', (req, res) => res.json({ success: true }));

// 404
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'ไม่พบ API ที่ร้องขอ' }));

// Error handler กลาง — ไม่ส่ง stack trace / รายละเอียดภายในออกไปให้ client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ success: false, message: 'Origin ไม่ได้รับอนุญาต' });
    if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'ข้อมูลมีขนาดใหญ่เกินไป' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: 'ไฟล์มีขนาดใหญ่เกินไป' });
    console.error('[Unhandled Error]', err);
    res.status(500).json({ success: false, message: 'Server Error' });
});

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Backend] Server is running on port ${PORT} (${process.env.NODE_ENV || 'development'})`));
