const express = require('express');
const { getCalendario } = require('../controllers/calendario.controller');

const router = express.Router();

router.get('/', getCalendario);

module.exports = router;
