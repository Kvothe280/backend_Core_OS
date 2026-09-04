const Carta = require('../models/Carta');
const Recuerdo = require('../models/Recuerdo');
const Vale = require('../models/Vale');
const { asegurarValesMensuales, periodoActual } = require('../services/monthly');
const { FECHA_INICIO } = require('../config/env');
const { diasDesde } = require('../utils/fechas');
const { esCita, serieMensual } = require('../utils/estadisticas');

async function getDashboard(req, res) {
  try {
    await asegurarValesMensuales();
    const usuario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const [cartas, recuerdos, valesMensuales, valesCanjeados] = await Promise.all([
      Carta.find(),
      Recuerdo.find(),
      Vale.find({ tipo: 'mensual', periodo, usuario, estado: { $ne: 'canjeado' } }),
      Vale.countDocuments({ estado: 'canjeado', usuario }),
    ]);
    res.json({
      fechaInicio: FECHA_INICIO,
      periodo,
      metricas: {
        diasJuntos: diasDesde(FECHA_INICIO),
        cartasEscritas: cartas.length,
        citas: recuerdos.filter(esCita).length,
        valesCanjeados,
      },
      serie: serieMensual(cartas, recuerdos),
      valesMensuales,
      recuerdosRecientes: recuerdos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
        .map(r => {
          const obj = r.toObject();
          if (obj.imagenEnBD) obj.imagen = `/api/imagen/recuerdo/${obj._id}`;
          return obj;
        }),
    });
  } catch (error) {
    console.error('[CORE OS] Error GET /api/dashboard:', error);
    res.status(500).json({ error: 'No se pudo cargar el panel.' });
  }
}

module.exports = { getDashboard };
