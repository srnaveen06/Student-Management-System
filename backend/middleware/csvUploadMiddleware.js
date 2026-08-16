const multer = require('multer');

// CSV uploads are kept in memory (no need to persist the raw file).
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.csv$/i.test(file.originalname) || file.mimetype === 'text/csv' || file.mimetype.includes('csv');
    if (ok) cb(null, true);
    else cb(new Error('Only CSV files are allowed'), false);
  }
});
