const express = require('express');
const { getCanciones, postCancion } = require('../controllers/canciones.controller');

const router = express.Router();

router.get('/', getCanciones);
router.post('/', postCancion);

module.exports = router;
