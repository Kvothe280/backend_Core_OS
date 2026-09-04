const express = require('express');
const { listar, crear, actualizar, borrar } = require('../controllers/fechasImportantes.controller');

const router = express.Router();

router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', borrar);

module.exports = router;
