const PreguntaMensual = require('../models/PreguntaMensual');
const ValeEspecialMes = require('../models/ValeEspecialMes');
const { periodoActual } = require('../services/monthly');
const { verificarEstadoEspecial, seleccionarValeEspecial } = require('../services/valeEspecial');
const { diaActual } = require('../utils/fechas');
const { normalizar } = require('../utils/texto');
const { otroUsuario } = require('../utils/usuarios');

// Mis preguntas — solo las del usuario activo como autor (para ver en admin)
async function listarMias(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const preguntas = await PreguntaMensual.find({ autor, periodo: periodoActual() }).sort({ orden: 1 });
    res.json(preguntas);
  } catch { res.status(500).json({ error: 'Error cargando preguntas.' }); }
}

async function crear(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const dia = diaActual();
    if (dia > 12) return res.status(400).json({ error: 'El período de carga cerró el día 12.' });
    const total = await PreguntaMensual.countDocuments({ autor, periodo });
    if (total >= 6) return res.status(400).json({ error: 'Ya cargaste las 6 preguntas del mes.' });
    const { pregunta, respuesta } = req.body;
    if (!pregunta || !respuesta) return res.status(400).json({ error: 'Faltan pregunta y respuesta.' });
    const doc = await PreguntaMensual.create({ pregunta, respuesta: normalizar(respuesta), autor, periodo, orden: total + 1 });
    res.status(201).json(doc);
  } catch { res.status(500).json({ error: 'No se pudo crear la pregunta.' }); }
}

async function borrar(req, res) {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const dia = diaActual();
    if (dia > 12) return res.status(400).json({ error: 'Ya no se pueden borrar preguntas (día 12 pasó).' });
    await PreguntaMensual.findOneAndDelete({ _id: req.params.id, autor, periodo: periodoActual() });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
}

// Pregunta activa para responder (del otro usuario)
async function getActiva(req, res) {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const autor = otroUsuario(destinatario);
    const periodo = periodoActual();
    const dia = diaActual();

    // Verificar/actualizar estado del vale especial
    const vem = await verificarEstadoEspecial(periodo, destinatario);

    if (dia < 13) {
      const totalAutor = await PreguntaMensual.countDocuments({ autor, periodo });
      return res.json({
        estado: 'carga',
        mensaje: `Las preguntas abren el día 13. ${autor} lleva ${totalAutor}/6 cargadas.`,
      });
    }

    if (vem?.estado === 'compensacion') {
      return res.json({ estado: 'compensacion', mensaje: `${autor} no cargó preguntas. Vale especial desbloqueado como compensación.`, penalizacion: 'grave' });
    }
    if (vem?.estado === 'inutilizado') {
      return res.json({ estado: 'inutilizado', mensaje: 'El plazo venció el día 18 sin completar todas las preguntas.', penalizacion: vem.penalizacion });
    }
    if (vem?.estado === 'desbloqueado' || vem?.estado === 'canjeado') {
      return res.json({ estado: vem.estado, mensaje: 'Protocolo completado. Vale especial desbloqueado.' });
    }

    // Buscar siguiente pregunta no respondida
    const preguntas = await PreguntaMensual.find({ autor, periodo, respondida: false }).sort({ orden: 1 });
    if (!preguntas.length) {
      return res.json({ estado: 'sin_preguntas', mensaje: `${autor} aún no ha cargado preguntas para este mes.` });
    }

    const siguiente = preguntas[0];
    return res.json({
      estado: 'activa',
      id: siguiente._id,
      orden: siguiente.orden,
      totalPreguntas: await PreguntaMensual.countDocuments({ autor, periodo }),
      respondidas: await PreguntaMensual.countDocuments({ autor, periodo, respondida: true }),
      pregunta: siguiente.pregunta,
      dia,
    });
  } catch (error) {
    console.error('[CORE OS] Error preguntas-mes/activa:', error);
    res.status(500).json({ error: 'Error consultando preguntas.' });
  }
}

// Responder pregunta activa
async function responder(req, res) {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const autor = otroUsuario(destinatario);
    const periodo = periodoActual();
    const dia = diaActual();

    if (dia < 13) return res.status(400).json({ ok: false, mensaje: 'Aún no es el período de respuesta (día 13).' });
    if (dia > 18) return res.status(400).json({ ok: false, mensaje: 'El plazo de respuesta venció el día 18.' });

    const siguiente = await PreguntaMensual.findOne({ autor, periodo, respondida: false }).sort({ orden: 1 });
    if (!siguiente) return res.json({ ok: false, mensaje: 'No hay pregunta activa.' });

    const { respuesta } = req.body;
    if (normalizar(respuesta) !== normalizar(siguiente.respuesta)) {
      return res.json({ ok: false, incorrecto: true, mensaje: 'Respuesta incorrecta. Inténtalo de nuevo.' });
    }

    siguiente.respondida = true;
    siguiente.fechaRespuesta = new Date();
    await siguiente.save();

    // ¿Todas respondidas?
    const pendientes = await PreguntaMensual.countDocuments({ autor, periodo, respondida: false });
    const totalPreguntas = await PreguntaMensual.countDocuments({ autor, periodo });

    if (pendientes === 0 && totalPreguntas >= 6) {
      // Desbloquear vale especial
      let vem = await ValeEspecialMes.findOne({ periodo, destinatario });
      if (!vem || vem.estado === 'pendiente') {
        const vale = await seleccionarValeEspecial(autor, periodo);
        const fechaVenc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (vem) {
          vem.valeEspecialPoolId = vale?._id || null;
          vem.titulo = vale?.titulo || '';
          vem.descripcion = vale?.descripcion || '';
          vem.estado = 'desbloqueado';
          vem.fechaDesbloqueo = new Date();
          vem.fechaVencimiento = fechaVenc;
          await vem.save();
        } else {
          vem = await ValeEspecialMes.create({
            periodo, destinatario, autor,
            valeEspecialPoolId: vale?._id || null,
            titulo: vale?.titulo || '',
            descripcion: vale?.descripcion || '',
            estado: 'desbloqueado',
            fechaDesbloqueo: new Date(),
            fechaVencimiento: fechaVenc,
          });
        }
        return res.json({ ok: true, completado: true, mensaje: `¡Protocolo completado! Vale especial desbloqueado: ${vem.titulo}`, vem });
      }
    }

    const respondidas = totalPreguntas - pendientes;
    return res.json({
      ok: true,
      completado: false,
      mensaje: `${respondidas}/${totalPreguntas} preguntas respondidas.`,
      pendientes,
    });
  } catch (error) {
    console.error('[CORE OS] Error responder pregunta:', error);
    res.status(500).json({ ok: false, mensaje: 'Error interno.' });
  }
}

module.exports = { listarMias, crear, borrar, getActiva, responder };
