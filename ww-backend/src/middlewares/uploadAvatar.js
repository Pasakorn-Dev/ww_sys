const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: (_req, file, cb) => {
        const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (MIME_TO_EXT[file.mimetype]) {
        return cb(null, true);
    }
    const err = new Error('INVALID_AVATAR_TYPE');
    cb(err);
};

const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

module.exports = { uploadAvatar, AVATAR_DIR };
