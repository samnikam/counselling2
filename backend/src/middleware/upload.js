const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

const SUBDIRS = ['gallery', 'videos', 'talent', 'avatars', 'notices', 'resources'];
for (const dir of SUBDIRS) {
  fs.mkdirSync(path.join(env.UPLOAD_DIR, dir), { recursive: true });
}

// Extension AND declared MIME type must both match a known-safe pairing. This stops naive
// extension-renaming; it is not magic-byte sniffing, so uploads are still served as static
// files only, never executed.
const ALLOWED = {
  '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'],
  '.gif': ['image/gif'], '.webp': ['image/webp'],
  '.mp4': ['video/mp4'], '.webm': ['video/webm'],
  '.pdf': ['application/pdf'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = SUBDIRS.includes(req.params.type) ? req.params.type : 'gallery';
    cb(null, path.join(env.UPLOAD_DIR, type));
  },
  // Random name: never trust the client's filename (path traversal, overwrite, collisions).
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okMimes = ALLOWED[ext];
    if (okMimes && okMimes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
});

/** Public URL for a stored file, derived from the subdir multer chose. */
function publicPath(file) {
  return `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;
}

module.exports = { upload, publicPath, SUBDIRS };
