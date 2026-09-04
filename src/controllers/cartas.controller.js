const Carta = require('../models/Carta');

async function listar(_req, res) {
  try {
    const cartas = await Carta.find().sort({ createdAt: -1 });
    res.json(cartas.map((c) => {
      const obj = c.toObject();
      if (c.imagenEnBD) obj.imagen = `/api/imagen/carta/${c._id}`;
      return obj;
    }));
  } catch (error) {
    console.error('[CORE OS] Error GET /api/cartas:', error);
    res.status(500).json({ error: 'No se pudieron cargar las cartas.' });
  }
}

async function crear(req, res) {
  try {
    const { titulo, cuerpo, autor, fecha, para } = req.body;
    if (!titulo || !autor) return res.status(400).json({ error: 'Faltan título o autor.' });
    const doc = { titulo, cuerpo: cuerpo || '', autor, para: para || '', fecha: fecha ? new Date(fecha) : null };
    if (req.file?.buffer) { doc.imagenData = req.file.buffer; doc.imagenMime = req.file.mimetype; doc.imagenEnBD = true; }
    const carta = await Carta.create(doc);
    if (carta.imagenEnBD) carta.imagen = `/api/imagen/carta/${carta._id}`;
    res.status(201).json(carta);
  } catch (error) {
    console.error('[CORE OS] Error POST /api/cartas:', error);
    res.status(500).json({ error: 'No se pudo guardar la carta.' });
  }
}

async function actualizar(req, res) {
  try {
    const { titulo, cuerpo, autor, fecha, para } = req.body;
    if (!titulo || !autor) return res.status(400).json({ error: 'Faltan título o autor.' });
    const updates = { titulo, cuerpo: cuerpo || '', autor, para: para || '', fecha: fecha ? new Date(fecha) : null };
    if (req.file?.buffer) {
      updates.imagenData = req.file.buffer;
      updates.imagenMime = req.file.mimetype;
      updates.imagenEnBD = true;
      updates.imagen = '';
    }
    const carta = await Carta.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!carta) return res.status(404).json({ error: 'Carta no encontrada.' });
    if (carta.imagenEnBD) carta.imagen = `/api/imagen/carta/${carta._id}`;
    res.json(carta);
  } catch (error) {
    console.error('[CORE OS] Error PUT /api/cartas:', error);
    res.status(500).json({ error: 'No se pudo actualizar la carta.' });
  }
}

async function borrar(req, res) {
  try { await Carta.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (error) {
    console.error('[CORE OS] Error DELETE /api/cartas:', error);
    res.status(500).json({ error: 'No se pudo borrar la carta.' });
  }
}

module.exports = { listar, crear, actualizar, borrar };
