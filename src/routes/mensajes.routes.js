const express = require('express');
const { upload, comprimirArchivo } = require('../middlewares/upload');
const { listar, crear, borrar } = require('../controllers/mensajes.controller');

const router = express.Router();

router.get('/', listar);
router.post('/', upload.single('archivo'), comprimirArchivo, crear);
router.delete('/:id', borrar);

module.exports = router;
