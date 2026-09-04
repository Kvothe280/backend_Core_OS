const express = require('express');
const { listarMias, crear, borrar, getActiva, responder } = require('../controllers/preguntasMes.controller');

const router = express.Router();

router.get('/activa', getActiva);
router.post('/responder', responder);
router.get('/', listarMias);
router.post('/', crear);
router.delete('/:id', borrar);

module.exports = router;
