const multer = require('multer');
const sharp = require('sharp');

const EXTS_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

async function comprimirArchivo(req, _res, next) {
  if (!req.file) return next();
  const ext = (req.file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  if (!EXTS_IMAGEN.has(ext)) return next();
  try {
    req.file.buffer = await sharp(req.file.buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    req.file.mimetype = 'image/jpeg';
  } catch (err) {
    console.error('[CORE OS] Error al comprimir imagen:', err.message);
  }
  next();
}

module.exports = { upload, comprimirArchivo };
