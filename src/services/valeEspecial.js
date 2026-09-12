const ValeEspecialPool = require('../models/ValeEspecialPool');
const ValeEspecialMes = require('../models/ValeEspecialMes');
const PreguntaMensual = require('../models/PreguntaMensual');
const { diaActual } = require('../utils/fechas');
const { otroUsuario } = require('../utils/usuarios');

function ultimos3Periodos(periodo) {
  const [year, month] = periodo.split('-').map(Number);
  return [1, 2, 3].map((i) => {
    let m = month - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    return `${y}-${String(m).padStart(2, '0')}`;
  });
}

function calcularPenalizacion(faltantes) {
  if (faltantes >= 5) return 'grave';
  if (faltantes >= 3) return 'media';
  if (faltantes >= 1) return 'ligera';
  return null;
}

async function seleccionarValeEspecial(autor, periodo) {
  const blackout = ultimos3Periodos(periodo);
  let candidatos = await ValeEspecialPool.find({ autor, usadoEnPeriodos: { $nin: blackout } }).lean();
  if (!candidatos.length) {
    // Pool agotado: usar los más antiguos (menos veces usados)
    candidatos = await ValeEspecialPool.find({ autor }).sort({ 'usadoEnPeriodos.length': 1 }).lean();
  }
  if (!candidatos.length) return null;
  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  await ValeEspecialPool.findByIdAndUpdate(elegido._id, { $push: { usadoEnPeriodos: periodo } });
  return elegido;
}

// Verifica y actualiza el estado del ValeEspecialMes del destinatario al consultarlo
async function verificarEstadoEspecial(periodo, destinatario) {
  const dia = diaActual();
  const autor = otroUsuario(destinatario);
  let vem = await ValeEspecialMes.findOne({ periodo, destinatario });

  // Si ya tiene estado final, no hacer nada
  if (vem && ['desbloqueado', 'compensacion', 'inutilizado', 'canjeado'].includes(vem.estado)) {
    return vem;
  }

  const preguntasAutor = await PreguntaMensual.find({ autor, periodo }).sort({ orden: 1 });
  const total = preguntasAutor.length;
  const respondidas = preguntasAutor.filter((p) => p.respondida).length;
  const faltantes = 6 - respondidas;

  // Si es día 13+ y el autor no cargó preguntas → compensación automática
  if (dia >= 13 && total === 0) {
    if (!vem) {
      const vale = await seleccionarValeEspecial(autor, periodo);
      vem = await ValeEspecialMes.create({
        periodo, destinatario, autor,
        valeEspecialPoolId: vale?._id || null,
        titulo: vale?.titulo || 'Vale compensación',
        descripcion: vale?.descripcion || '',
        estado: 'compensacion',
        penalizacion: 'grave',
        fechaDesbloqueo: new Date(),
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
    return vem;
  }

  // Si pasó el día 18 y no está completo → inutilizar
  if (dia > 18) {
    if (respondidas < total || total < 6) {
      if (!vem) {
        vem = await ValeEspecialMes.create({
          periodo, destinatario, autor,
          estado: 'inutilizado',
          penalizacion: calcularPenalizacion(faltantes),
        });
      } else if (vem.estado === 'pendiente') {
        vem.estado = 'inutilizado';
        vem.penalizacion = calcularPenalizacion(faltantes);
        await vem.save();
      }
      return vem;
    }
  }

  return vem;
}

module.exports = { seleccionarValeEspecial, verificarEstadoEspecial, ultimos3Periodos, calcularPenalizacion };
