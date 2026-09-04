const express = require('express');
const { listar, crear, actualizar, borrar } = require('../controllers/wishlist.controller');

const router = express.Router();

router.get('/', listar);
router.post('/', crear);
router.patch('/:id', actualizar);
router.delete('/:id', borrar);

module.exports = router;
