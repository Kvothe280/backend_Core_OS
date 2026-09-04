// Rutas públicas — sirven binarios (<img src>), que no pueden mandar cabeceras de auth.
// Se montan ANTES del middleware verificarToken (ver app.js).
const express = require('express');
const { getImagenCarta, getImagenRecuerdo, getImagenMensaje, getAvatar } = require('../controllers/imagenes.controller');

const router = express.Router();

router.get('/imagen/carta/:id', getImagenCarta);
router.get('/imagen/recuerdo/:id', getImagenRecuerdo);
router.get('/imagen/mensaje/:id', getImagenMensaje);
router.get('/avatar/:usuario', getAvatar);

module.exports = router;
