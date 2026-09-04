const express = require('express');
const { getActual, canjear } = require('../controllers/valeEspecialMes.controller');

const router = express.Router();

router.get('/', getActual);
router.post('/canjear', canjear);

module.exports = router;
