const ValeEspecialMes = require('../models/ValeEspecialMes');
const { periodoActual } = require('../services/monthly');
const { verificarEstadoEspecial } = require('../services/valeEspecial');
const { notificar } = require('../services/notificaciones');
const { diaActual } = require('../utils/fechas');

async function getActual(req, res) {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const vem = await verificarEstadoEspecial(periodo, destinatario);
    if (!vem) {
      const dia = diaActual();
      return res.json({
        estado: dia < 13 ? 'carga' : 'pendiente',
        mensaje: dia < 13 ? 'Período de carga (días 1-12). Respuesta abre el día 13.' : 'En espera de completar las preguntas.',
      });
    }
    res.json(vem);
  } catch { res.status(500).json({ error: 'Error consultando vale especial.' }); }
}

async function canjear(req, res) {
  try {
    const { fecha } = req.body;
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const vem = await ValeEspecialMes.findOne({ periodo, destinatario });
    if (!vem) return res.status(404).json({ error: 'Sin vale especial este mes.' });
    if (!['desbloqueado', 'compensacion'].includes(vem.estado)) {
      return res.status(400).json({ error: `Estado del vale: ${vem.estado}.` });
    }
    vem.estado = 'canjeado';
    vem.fechaCanje = fecha ? new Date(fecha) : new Date();
    await vem.save();
    const nombreDest = destinatario === 'karol' ? 'Karol' : 'Enrique';
    const fechaTexto = vem.fechaCanje.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const autor = vem.autor;
    await notificar(destinatario, `✅ Canjeaste tu vale especial "${vem.titulo}". ¡Disfrútalo! Fecha: ${fechaTexto}.`);
    await notificar(autor, `🎁 ${nombreDest} canjeó su vale especial "${vem.titulo}". Fecha: ${fechaTexto}.`);
    res.json({ ok: true, vem });
  } catch { res.status(500).json({ error: 'No se pudo canjear.' }); }
}

module.exports = { getActual, canjear };
