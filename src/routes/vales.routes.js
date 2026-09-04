const express = require('express');
const { getVales, canjearVale } = require('../controllers/vales.controller');

const router = express.Router();

router.get('/', getVales);
router.post('/canjear', canjearVale);

module.exports = router;
