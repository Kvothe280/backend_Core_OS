const Vale = require('../models/Vale');
const ValeEspecialMes = require('../models/ValeEspecialMes');
const Recuerdo = require('../models/Recuerdo');
const Carta = require('../models/Carta');
const CitaPropuesta = require('../models/CitaPropuesta');
const { periodoActual } = require('../services/monthly');
const { otroUsuario } = require('../utils/usuarios');
const { agregarEvento } = require('../utils/estadisticas');

async function getCalendario(req, res) {
  try {
    const { mes } = req.query; // 'YYYY-MM'
    const usuario = req.headers['x-usuario'] || 'enrique';
    const otro = otroUsuario(usuario);

    const [year, month] = (mes || periodoActual()).split('-').map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    const [valesCanjeados, valesEspecialesCanjeados, recuerdos, cartas, citasPropuestas] = await Promise.all([
      Vale.find({ estado: 'canjeado', usuario, 'detalles_canje.fecha': { $gte: inicio, $lt: fin } }).lean(),
      ValeEspecialMes.find({ estado: 'canjeado', destinatario: usuario, fechaCanje: { $gte: inicio, $lt: fin } }).lean(),
      Recuerdo.find({ fecha: { $gte: inicio, $lt: fin } }).lean(),
      Carta.find({ $or: [{ fecha: { $gte: inicio, $lt: fin } }, { createdAt: { $gte: inicio, $lt: fin } }] }).lean(),
      CitaPropuesta.find({
        $or: [{ proponente: usuario }, { destinatario: usuario }, { proponente: otro }, { destinatario: otro }],
        estado: { $in: ['pendiente', 'aceptada'] },
        fechaPropuesta: { $gte: inicio, $lt: fin },
      }).lean(),
    ]);

    const eventos = {};

    for (const v of valesCanjeados) {
      agregarEvento(eventos, v.detalles_canje?.fecha, { tipo: 'vale_canjeado', titulo: v.titulo, id: v._id });
    }
    for (const ve of valesEspecialesCanjeados) {
      agregarEvento(eventos, ve.fechaCanje, { tipo: 'vale_canjeado', titulo: ve.titulo || 'Vale especial', id: ve._id });
    }
    for (const r of recuerdos) {
      const tipo = (r.tipo === 'cita' || r.tipo === 'cafe') ? 'cita_registrada' : 'recuerdo';
      agregarEvento(eventos, r.fecha, { tipo, titulo: r.titulo, id: r._id });
    }
    for (const c of cartas) {
      agregarEvento(eventos, c.fecha || c.createdAt, { tipo: 'carta', titulo: c.titulo, autor: c.autor, id: c._id });
    }
    for (const cp of citasPropuestas) {
      const tipo = cp.estado === 'aceptada' ? 'cita_confirmada' : 'cita_pendiente';
      agregarEvento(eventos, cp.fechaPropuesta, { tipo, titulo: cp.titulo, id: cp._id, proponente: cp.proponente, destinatario: cp.destinatario, estado: cp.estado });
    }

    res.json(eventos);
  } catch (error) {
    console.error('[CORE OS] Error GET /api/calendario:', error);
    res.status(500).json({ error: 'No se pudo cargar el calendario.' });
  }
}

module.exports = { getCalendario };
