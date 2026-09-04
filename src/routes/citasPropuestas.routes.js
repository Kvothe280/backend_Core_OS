const express = require('express');
const {
  pendientes, listar, proponer, aceptar, rechazar, reagendar, cancelar, completar,
} = require('../controllers/citasPropuestas.controller');

const router = express.Router();

router.get('/pendientes', pendientes);
router.get('/', listar);
router.post('/', proponer);
router.put('/:id/aceptar', aceptar);
router.delete('/:id/rechazar', rechazar);
router.put('/:id/reagendar', reagendar);
router.delete('/:id/cancelar', cancelar);
router.put('/:id/completar', completar);

module.exports = router;
