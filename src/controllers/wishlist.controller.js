const WishlistItem = require('../models/WishlistItem');

async function listar(_req, res) {
  try {
    const items = await WishlistItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch { res.status(500).json({ error: 'Error al obtener wishlist.' }); }
}

async function crear(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: 'El texto es requerido.' });
    const item = await WishlistItem.create({ texto: String(texto).slice(0, 200), creadoPor: usuario });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Error al agregar ítem.' }); }
}

async function actualizar(req, res) {
  try {
    const item = await WishlistItem.findByIdAndUpdate(
      req.params.id,
      { hecho: req.body.hecho },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado.' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Error al actualizar ítem.' }); }
}

async function borrar(req, res) {
  try {
    await WishlistItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error al eliminar ítem.' }); }
}

module.exports = { listar, crear, actualizar, borrar };
