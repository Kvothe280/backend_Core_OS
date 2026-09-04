const express = require('express');
const { listar } = require('../controllers/usuarios.controller');

const router = express.Router();

router.get('/', listar);

module.exports = router;
