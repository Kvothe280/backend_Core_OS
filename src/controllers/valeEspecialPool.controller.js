const ValeEspecialPool = require('../models/ValeEspecialPool');

async function listar(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    res.json(await ValeEspecialPool.find({ autor }).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ error: 'Error cargando pool especial.' }); }
}

async function crear(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const { titulo, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    res.status(201).json(await ValeEspecialPool.create({ titulo, descripcion: descripcion || '', autor }));
  } catch { res.status(500).json({ error: 'No se pudo crear.' }); }
}

async function actualizar(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const doc = await ValeEspecialPool.findOne({ _id: req.params.id, autor });
    if (!doc) return res.status(404).json({ error: 'No encontrado.' });
    const { titulo, descripcion } = req.body;
    if (titulo) doc.titulo = titulo;
    if (descripcion !== undefined) doc.descripcion = descripcion;
    await doc.save();
    res.json(doc);
  } catch { res.status(500).json({ error: 'No se pudo actualizar.' }); }
}

async function borrar(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    await ValeEspecialPool.findOneAndDelete({ _id: req.params.id, autor });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
}

module.exports = { listar, crear, actualizar, borrar };
