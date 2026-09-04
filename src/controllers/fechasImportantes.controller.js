const FechaImportante = require('../models/FechaImportante');

async function listar(_req, res) {
  try {
    const items = await FechaImportante.find().sort({ fecha: 1 });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Error al obtener fechas importantes.' });
  }
}

async function crear(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { titulo, fecha, tipo, emoji } = req.body;
    if (!titulo || !fecha || !tipo) {
      return res.status(400).json({ error: 'Título, fecha y tipo son requeridos.' });
    }
    if (!['unica', 'anual'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido.' });
    }
    const item = await FechaImportante.create({
      titulo: String(titulo).slice(0, 100),
      fecha,
      tipo,
      emoji: emoji ? String(emoji).slice(0, 8) : undefined,
      creadoPor: usuario,
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Error al agregar fecha importante.' });
  }
}

async function actualizar(req, res) {
  try {
    const { titulo, fecha, tipo, emoji } = req.body;
    if (tipo && !['unica', 'anual'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido.' });
    }
    const cambios = {};
    if (titulo !== undefined) cambios.titulo = String(titulo).slice(0, 100);
    if (fecha !== undefined) cambios.fecha = fecha;
    if (tipo !== undefined) cambios.tipo = tipo;
    if (emoji !== undefined) cambios.emoji = String(emoji).slice(0, 8);
    const item = await FechaImportante.findByIdAndUpdate(req.params.id, cambios, { new: true });
    if (!item) return res.status(404).json({ error: 'Fecha no encontrada.' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Error al actualizar fecha importante.' });
  }
}

async function borrar(req, res) {
  try {
    await FechaImportante.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar fecha importante.' });
  }
}

module.exports = { listar, crear, actualizar, borrar };
