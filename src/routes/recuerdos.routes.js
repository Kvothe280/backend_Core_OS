const express = require('express');
const { upload, comprimirArchivo } = require('../middlewares/upload');
const { listar, crear, actualizar, borrar } = require('../controllers/recuerdos.controller');

const router = express.Router();

router.get('/', listar);
router.post('/', upload.single('archivo'), comprimirArchivo, crear);
router.put('/:id', upload.single('archivo'), comprimirArchivo, actualizar);
router.delete('/:id', borrar);

module.exports = router;
