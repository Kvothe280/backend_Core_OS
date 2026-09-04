const Vale = require('../models/Vale');
const { asegurarValesMensuales } = require('../services/monthly');
const { notificar } = require('../services/notificaciones');
const { otroUsuario } = require('../utils/usuarios');

async function getVales(req, res) {
  try {
    await asegurarValesMensuales();
    const usuario = req.headers['x-usuario'] || 'enrique';
    const vales = await Vale.find({ usuario }).sort({ tipo: 1, createdAt: -1 });
    res.json({ vales });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los vales.' });
  }
}

async function canjearVale(req, res) {
  try {
    const { valeId, fecha, notas } = req.body;
    if (!valeId) return res.status(400).json({ error: 'Falta el identificador del vale.' });
    const usuario = req.headers['x-usuario'] || 'enrique';
    const vale = await Vale.findById(valeId);
    if (!vale) return res.status(404).json({ error: 'Vale no encontrado.' });
    if (vale.usuario !== usuario) return res.status(403).json({ error: 'No puedes canjear el vale de otro.' });
    if (vale.estado !== 'disponible') return res.status(400).json({ error: `Estado: ${vale.estado}.` });
    vale.estado = 'canjeado';
    vale.detalles_canje = { fecha: fecha ? new Date(fecha) : new Date(), notas: notas || '' };
    await vale.save();
    const fechaTexto = vale.detalles_canje.fecha.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
    const nombreUsuario = usuario === 'karol' ? 'Karol' : 'Enrique';
    const otro = otroUsuario(usuario);
    await notificar(usuario, `✅ Canjeaste el vale "${vale.titulo}". Fecha: ${fechaTexto}.`);
    await notificar(otro, `🎟️ ${nombreUsuario} canjeó el vale "${vale.titulo}". Fecha: ${fechaTexto}.`);
    res.json({ ok: true, vale });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo canjear el vale.' });
  }
}

module.exports = { getVales, canjearVale };
