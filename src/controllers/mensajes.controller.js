const Mensaje = require('../models/Mensaje');
const { notificarPrimerMensaje } = require('../services/notificaciones');
const { proximaMedianoche } = require('../utils/fechas');
const { otroUsuario } = require('../utils/usuarios');

async function listar(_req, res) {
  try {
    const ahora = new Date();
    const mensajes = await Mensaje.find({ expiraEn: { $gt: ahora } }).sort({ createdAt: 1 });
    const resultado = mensajes.map(m => {
      const obj = m.toObject();
      if (obj.imagenEnBD) obj.imagen = `/api/imagen/mensaje/${obj._id}`;
      return obj;
    });
    res.json(resultado);
  } catch { res.status(500).json({ error: 'No se pudieron cargar los mensajes.' }); }
}

async function crear(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const { contenido } = req.body;
    if (!contenido?.trim() && !req.file) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }
    const doc = {
      autor,
      contenido: String(contenido || '').slice(0, 2000),
      expiraEn: proximaMedianoche(),
    };
    if (req.file?.buffer) {
      doc.imagenData = req.file.buffer;
      doc.imagenMime = req.file.mimetype;
      doc.imagenEnBD = true;
    }
    const mensaje = await Mensaje.create(doc);
    if (mensaje.imagenEnBD) mensaje.imagen = `/api/imagen/mensaje/${mensaje._id}`;
    // Notificar al otro solo con el primer mensaje del día
    const destinatario = otroUsuario(autor);
    notificarPrimerMensaje(destinatario, autor).catch(() => {});
    res.status(201).json(mensaje);
  } catch (err) {
    console.error('[CORE OS] Error POST /api/mensajes:', err);
    res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
  }
}

async function borrar(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const mensaje = await Mensaje.findById(req.params.id);
    if (!mensaje) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    if (mensaje.autor !== autor) return res.status(403).json({ error: 'Solo puedes borrar tus propios mensajes.' });
    await mensaje.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar el mensaje.' }); }
}

module.exports = { listar, crear, borrar };
