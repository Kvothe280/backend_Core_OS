// El GET público de /api/avatar/:usuario vive en imagenes.routes.js (se sirve antes
// del middleware de auth, como el resto de imágenes). Esta ruta es solo la subida,
// que sí requiere sesión.
const express = require('express');
const { upload, comprimirArchivo } = require('../middlewares/upload');
const { postAvatar } = require('../controllers/avatar.controller');

const router = express.Router();

router.post('/', upload.single('archivo'), comprimirArchivo, postAvatar);

module.exports = router;
