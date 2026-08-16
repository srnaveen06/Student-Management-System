// AI document upload — memory storage so text/CSV content can be parsed for
// extraction. Accepts CSV, text, JSON, PDF and image files up to 10MB.

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /csv|txt|text\/plain|json|jpeg|jpg|png|pdf/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test((file.mimetype || '').toLowerCase());
  if (extOk || mimeOk) cb(null, true);
  else cb(new Error('Only CSV, text, JSON, PDF or image files are allowed'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
