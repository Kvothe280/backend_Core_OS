const CitaPropuesta = require('../models/CitaPropuesta');
const Recuerdo = require('../models/Recuerdo');
const { notificar } = require('../services/notificaciones');
const { otroUsuario } = require('../utils/usuarios');

// Citas pendientes que me enviaron a mí
async function pendientes(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const citas = await CitaPropuesta.find({ destinatario: usuario, estado: 'pendiente' }).sort({ fechaPropuesta: 1 });
    res.json(citas);
  } catch { res.status(500).json({ error: 'Error cargando citas pendientes.' }); }
}

// Todas las citas que involucran al usuario (para la sidebar)
async function listar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const citas = await CitaPropuesta.find({
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: { $in: ['pendiente', 'aceptada'] },
    }).sort({ fechaPropuesta: 1 });
    res.json(citas);
  } catch { res.status(500).json({ error: 'Error cargando citas.' }); }
}

// Proponer nueva cita
async function proponer(req, res) {
  try {
    const proponente = req.headers['x-usuario'] || 'enrique';
    const { titulo, nota, fechaPropuesta } = req.body;
    if (!titulo || !fechaPropuesta) return res.status(400).json({ error: 'Faltan título y fecha.' });
    const destinatario = otroUsuario(proponente);
    const cita = await CitaPropuesta.create({
      proponente,
      destinatario,
      titulo,
      nota: nota || '',
      fechaPropuesta: new Date(fechaPropuesta),
    });
    const nombreProp = proponente === 'karol' ? 'Karol' : 'Enrique';
    const fechaCitaTexto = new Date(fechaPropuesta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await notificar(destinatario, `📅 ${nombreProp} te propuso una cita: "${titulo}" para el ${fechaCitaTexto}. Entra a CORE OS para aceptar o rechazar.`);
    res.status(201).json(cita);
  } catch { res.status(500).json({ error: 'No se pudo crear la cita.' }); }
}

// Aceptar cita (solo el destinatario)
async function aceptar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({ _id: req.params.id, destinatario: usuario, estado: 'pendiente' });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada o no puedes aceptarla.' });

    // Crear Recuerdo inmediatamente al aceptar
    const recuerdo = await Recuerdo.create({
      titulo: cita.titulo,
      nota: cita.nota || '',
      tipo: 'cita',
      fecha: cita.fechaPropuesta,
    });

    cita.estado = 'aceptada';
    cita.fechaRespuesta = new Date();
    cita.recuerdoId = recuerdo._id;
    await cita.save();

    const nombreDest = usuario === 'karol' ? 'Karol' : 'Enrique';
    await notificar(cita.proponente, `✅ ${nombreDest} aceptó tu cita "${cita.titulo}". ¡Ya está en Recuerdos!`);
    res.json(cita);
  } catch { res.status(500).json({ error: 'No se pudo aceptar.' }); }
}

// Rechazar cita (solo el destinatario) → se elimina
async function rechazar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({ _id: req.params.id, destinatario: usuario, estado: 'pendiente' });
    if (!cita) return res.status(404).json({ error: 'No encontrada o ya no es pendiente.' });
    const nombreDest = usuario === 'karol' ? 'Karol' : 'Enrique';
    await notificar(cita.proponente, `❌ ${nombreDest} no pudo aceptar la cita "${cita.titulo}". Puedes proponer otra fecha.`);
    await cita.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo rechazar.' }); }
}

// Reagendar cita aceptada (cualquiera de los dos)
async function reagendar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ error: 'Falta la nueva fecha.' });
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: 'aceptada',
    });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada o no está aceptada.' });
    cita.fechaPropuesta = new Date(fecha);
    await cita.save();
    if (cita.recuerdoId) {
      await Recuerdo.findByIdAndUpdate(cita.recuerdoId, { fecha: new Date(fecha) });
    }
    const nombreUsuario = usuario === 'karol' ? 'Karol' : 'Enrique';
    const otro = otroUsuario(usuario);
    const fechaTexto = new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await notificar(otro, `📅 ${nombreUsuario} reagendó la cita "${cita.titulo}" para el ${fechaTexto}.`);
    res.json({ ok: true, cita });
  } catch { res.status(500).json({ error: 'No se pudo reagendar.' }); }
}

// Cancelar cita (cualquiera de los dos, en cualquier estado activo)
async function cancelar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: { $in: ['pendiente', 'aceptada'] },
    });
    if (!cita) return res.status(404).json({ error: 'No encontrada.' });
    await cita.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo cancelar.' }); }
}

// Completar cita → marca como completada (el Recuerdo ya fue creado al aceptar)
async function completar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: 'aceptada',
    });
    if (!cita) return res.status(404).json({ error: 'No encontrada o no está aceptada.' });
    cita.estado = 'completada';
    await cita.save();
    res.json({ ok: true, cita });
  } catch { res.status(500).json({ error: 'No se pudo completar.' }); }
}

module.exports = { pendientes, listar, proponer, aceptar, rechazar, reagendar, cancelar, completar };
