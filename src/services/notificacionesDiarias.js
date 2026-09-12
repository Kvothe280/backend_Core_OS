const cron = require('node-cron');
const FechaImportante = require('../models/FechaImportante');
const CitaPropuesta = require('../models/CitaPropuesta');
const { notificar } = require('./notificaciones');
const { FECHA_INICIO } = require('../config/env');

function hoyLocal() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

// FechaImportante.fecha viene de un <input type="date"> y se guarda como medianoche
// UTC del día elegido — leer sus componentes UTC da de vuelta ese mismo día sin
// importar la zona del server (mismo principio que formatearFecha() en el frontend).
function componentesUTC(fecha) {
  const d = new Date(fecha);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

function parseFechaLiteral(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function eventosDeHoy() {
  const hoy = hoyLocal();
  const eventos = [];

  const fechas = await FechaImportante.find();
  for (const f of fechas) {
    const c = componentesUTC(f.fecha);
    const coincide =
      f.tipo === 'unica'
        ? c.anio === hoy.anio && c.mes === hoy.mes && c.dia === hoy.dia
        : c.mes === hoy.mes && c.dia === hoy.dia;
    if (coincide) eventos.push(`${f.emoji || '📌'} ${f.titulo}`);
  }

  const inicio = parseFechaLiteral(FECHA_INICIO);
  for (let n = 3; n <= 120; n += 3) {
    const fecha = new Date(inicio);
    fecha.setMonth(fecha.getMonth() + n);
    if (fecha.getFullYear() === hoy.anio && fecha.getMonth() + 1 === hoy.mes && fecha.getDate() === hoy.dia) {
      eventos.push(`💜 ${n} meses juntos`);
      break;
    }
  }

  const inicioHoy = new Date(hoy.anio, hoy.mes - 1, hoy.dia);
  const inicioManana = new Date(hoy.anio, hoy.mes - 1, hoy.dia + 1);
  const citas = await CitaPropuesta.find({
    estado: 'aceptada',
    fechaPropuesta: { $gte: inicioHoy, $lt: inicioManana },
  });
  for (const c of citas) eventos.push(`📅 ${c.titulo}`);

  return eventos;
}

function armarMensaje(eventos) {
  if (eventos.length === 0) return null;
  return `🎉 Hoy es un día especial:\n${eventos.join('\n')}\n\nEntra a CORE OS para ver los detalles.`;
}

async function enviarNotificacionesDiarias() {
  const eventos = await eventosDeHoy();
  const mensaje = armarMensaje(eventos);
  if (!mensaje) {
    console.log('[NOTIF-DIARIAS] Sin eventos hoy, no se manda nada.');
    return;
  }
  console.log(`[NOTIF-DIARIAS] ${eventos.length} evento(s) hoy — enviando a ambos usuarios.`);
  await notificar('karol', mensaje);
  await notificar('enrique', mensaje);
}

function iniciarNotificacionesDiarias() {
  cron.schedule('0 7 * * *', enviarNotificacionesDiarias, { timezone: 'America/Mexico_City' });
  console.log('[NOTIF-DIARIAS] Cron registrado — todos los días a las 7:00am (America/Mexico_City).');
}

module.exports = { iniciarNotificacionesDiarias, eventosDeHoy, enviarNotificacionesDiarias };
