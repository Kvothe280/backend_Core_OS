const express = require('express');
const { listar } = require('../controllers/logros.controller');

const router = express.Router();

router.get('/', listar);

module.exports = router;
