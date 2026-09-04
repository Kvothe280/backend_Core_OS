const Recuerdo = require('../models/Recuerdo');
const { parseUbicacion } = require('../utils/ubicacion');

async function listar(_req, res) {
  try {
    const recuerdos = await Recuerdo.find().sort({ fecha: -1 });
    res.json(recuerdos.map((r) => {
      const obj = r.toObject();
      if (r.imagenEnBD) obj.imagen = `/api/imagen/recuerdo/${r._id}`;
      return obj;
    }));
  } catch (error) {
    console.error('[CORE OS] Error GET /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los recuerdos.' });
  }
}

async function crear(req, res) {
  try {
    const { titulo, nota, tipo, fecha } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    const doc = { titulo, nota: nota || '', tipo: tipo || 'recuerdo', fecha: fecha ? new Date(fecha) : new Date() };
    if (req.file?.buffer) { doc.imagenData = req.file.buffer; doc.imagenMime = req.file.mimetype; doc.imagenEnBD = true; }
    const ubicacion = parseUbicacion(req.body.ubicacion);
    if (ubicacion) doc.ubicacion = ubicacion;
    const recuerdo = await Recuerdo.create(doc);
    if (recuerdo.imagenEnBD) recuerdo.imagen = `/api/imagen/recuerdo/${recuerdo._id}`;
    res.status(201).json(recuerdo);
  } catch (error) {
    console.error('[CORE OS] Error POST /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo guardar el recuerdo.' });
  }
}

async function actualizar(req, res) {
  try {
    const { titulo, nota, tipo, fecha } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    const updates = { titulo, nota: nota || '', tipo: tipo || 'recuerdo' };
    if (fecha) updates.fecha = new Date(fecha);
    if (req.file?.buffer) {
      updates.imagenData = req.file.buffer;
      updates.imagenMime = req.file.mimetype;
      updates.imagenEnBD = true;
      updates.imagen = '';
    }
    if ('ubicacion' in req.body) {
      const ubicacion = parseUbicacion(req.body.ubicacion);
      updates.ubicacion = ubicacion || undefined;
      if (!ubicacion) await Recuerdo.findByIdAndUpdate(req.params.id, { $unset: { ubicacion: 1 } });
    }
    const recuerdo = await Recuerdo.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!recuerdo) return res.status(404).json({ error: 'Recuerdo no encontrado.' });
    if (recuerdo.imagenEnBD) recuerdo.imagen = `/api/imagen/recuerdo/${recuerdo._id}`;
    res.json(recuerdo);
  } catch (error) {
    console.error('[CORE OS] Error PUT /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo actualizar el recuerdo.' });
  }
}

async function borrar(req, res) {
  try { await Recuerdo.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (error) {
    console.error('[CORE OS] Error DELETE /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo borrar el recuerdo.' });
  }
}

module.exports = { listar, crear, actualizar, borrar };
