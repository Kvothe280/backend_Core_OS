const multer = require('multer');
const sharp = require('sharp');

// HEIC/HEIF incluidos — sharp los convierte a JPEG antes de guardar
const EXTS_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB para HEIC pre-compresión
});

const MONGO_LIMIT = 14 * 1024 * 1024; // 14 MB margen bajo el límite de 16 MB de MongoDB

async function comprimirArchivo(req, res, next) {
  if (!req.file) return next();
  const ext = (req.file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  if (!EXTS_IMAGEN.has(ext)) {
    // PDF u otro no-imagen: verificar que no supere el límite de MongoDB
    if (req.file.buffer.length > MONGO_LIMIT) {
      return res.status(413).json({ error: 'El archivo supera el límite de 14 MB para este tipo.' });
    }
    return next();
  }
  try {
    req.file.buffer = await sharp(req.file.buffer)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    req.file.mimetype = 'image/jpeg';
  } catch (err) {
    console.error('[CORE OS] Error al comprimir imagen:', err.message);
    // Si la compresión falla y el archivo original es muy grande, rechazar
    if (req.file.buffer.length > MONGO_LIMIT) {
      return res.status(413).json({ error: 'No se pudo procesar la imagen y supera el límite de 14 MB. Intenta con JPG o PNG.' });
    }
  }
  next();
}

module.exports = { upload, comprimirArchivo };
