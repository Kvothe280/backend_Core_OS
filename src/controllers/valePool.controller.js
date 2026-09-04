const ValePool = require('../models/ValePool');

async function listar(_req, res) {
  try { res.json(await ValePool.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: 'No se pudo cargar el pool.' }); }
}

async function crear(req, res) {
  try {
    const { titulo, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    res.status(201).json(await ValePool.create({ titulo, descripcion: descripcion || '' }));
  } catch { res.status(500).json({ error: 'No se pudo crear.' }); }
}

async function actualizar(req, res) {
  try {
    const doc = await ValePool.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'No encontrado.' });
    res.json(doc);
  } catch { res.status(500).json({ error: 'No se pudo actualizar.' }); }
}

async function borrar(req, res) {
  try { await ValePool.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
}

module.exports = { listar, crear, actualizar, borrar };
