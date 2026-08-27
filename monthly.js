const Vale = require('./models/Vale');

const POOL = [
  { titulo: 'Vale por un café juntos', descripcion: 'El de siempre, o uno nuevo.' },
  { titulo: 'Vale por una caminata', descripcion: 'Sin prisa y sin celular de por medio.' },
  { titulo: 'Vale por una película', descripcion: 'Tú eliges el título.' },
  { titulo: 'Vale por cocinar juntos', descripcion: 'Una receta, cuatro manos.' },
  { titulo: 'Vale por un masaje corto', descripcion: 'Veinte minutos, música baja.' },
  { titulo: 'Vale por desayuno en cama', descripcion: 'Lo más simple cuenta.' },
  { titulo: 'Vale por elegir la música del día', descripcion: 'Playlist completa, sin veto.' },
  { titulo: 'Vale por una cita sorpresa', descripcion: 'El otro arma el plan.' },
  { titulo: 'Vale por quedarnos en pijama', descripcion: 'Cero planes afuera.' },
  { titulo: 'Vale por un helado', descripcion: 'El sabor que pidas.' },
  { titulo: 'Vale por una foto juntos', descripcion: 'Aunque sea con el frente de la casa.' },
  { titulo: 'Vale por una carta corta', descripcion: 'Papel o digital, pero hoy.' },
];

function periodoActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function asegurarValesMensuales() {
  const periodo = periodoActual();

  // Limpiar TODOS los vales mensuales de periodos anteriores (incluidos canjeados)
  await Vale.deleteMany({ tipo: 'mensual', periodo: { $ne: periodo } });

  const vigentes = await Vale.find({ tipo: 'mensual', periodo, estado: { $ne: 'canjeado' } });
  const faltan = 4 - vigentes.length;
  if (faltan <= 0) return periodo;

  const titulosActuales = new Set(vigentes.map((v) => v.titulo));
  const recientes = await Vale.find({ tipo: 'mensual' }).sort({ createdAt: -1 }).limit(12);
  const usados = new Set(recientes.map((v) => v.titulo));

  let candidatos = POOL.filter((p) => !titulosActuales.has(p.titulo) && !usados.has(p.titulo));
  if (candidatos.length < faltan) {
    candidatos = POOL.filter((p) => !titulosActuales.has(p.titulo));
  }

  const elegidos = mezclar(candidatos).slice(0, faltan);
  await Vale.insertMany(
    elegidos.map((item) => ({
      ...item,
      tipo: 'mensual',
      estado: 'disponible',
      periodo,
      mes: 0,
    }))
  );

  return periodo;
}

module.exports = { asegurarValesMensuales, periodoActual, POOL };
