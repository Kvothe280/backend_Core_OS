const Vale = require('./models/Vale');
const ValePool = require('./models/ValePool');

// Fallback si el pool en BD está vacío
const POOL_FALLBACK = [
  { titulo: 'Vale por un café juntos',         descripcion: 'El de siempre, o uno nuevo.' },
  { titulo: 'Vale por una caminata',            descripcion: 'Sin prisa y sin celular de por medio.' },
  { titulo: 'Vale por una película',            descripcion: 'Tú eliges el título.' },
  { titulo: 'Vale por cocinar juntos',          descripcion: 'Una receta, cuatro manos.' },
  { titulo: 'Vale por un masaje corto',         descripcion: 'Veinte minutos, música baja.' },
  { titulo: 'Vale por desayuno en cama',        descripcion: 'Lo más simple cuenta.' },
  { titulo: 'Vale por elegir la música del día',descripcion: 'Playlist completa, sin veto.' },
  { titulo: 'Vale por una cita sorpresa',       descripcion: 'El otro arma el plan.' },
  { titulo: 'Vale por quedarnos en pijama',     descripcion: 'Cero planes afuera.' },
  { titulo: 'Vale por un helado',               descripcion: 'El sabor que pidas.' },
  { titulo: 'Vale por una foto juntos',         descripcion: 'Aunque sea con el frente de la casa.' },
  { titulo: 'Vale por una carta corta',         descripcion: 'Papel o digital, pero hoy.' },
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

  // Limpiar todos los vales mensuales de períodos anteriores (incluyendo canjeados)
  await Vale.deleteMany({ tipo: 'mensual', periodo: { $ne: periodo } });

  // Pool activo desde BD; si no hay, usar fallback hardcodeado
  let pool = await ValePool.find({ activo: true }).lean();
  if (pool.length === 0) pool = POOL_FALLBACK;

  for (const usuario of ['enrique', 'karol']) {
    const totalPeriodo = await Vale.countDocuments({ tipo: 'mensual', periodo, usuario });
    if (totalPeriodo >= 4) continue;

    const vigentes = await Vale.find({ tipo: 'mensual', periodo, usuario, estado: { $ne: 'canjeado' } });
    const faltan = 4 - totalPeriodo;

    const titulosActuales = new Set(vigentes.map((v) => v.titulo));

    // Anti-consecutivo: excluir los usados en los últimos 8 vales por usuario (~2 meses)
    const recientes = await Vale.find({ tipo: 'mensual', usuario }).sort({ createdAt: -1 }).limit(8);
    const usados = new Set(recientes.map((v) => v.titulo));

    // Candidatos frescos (no en el mes ni en los últimos 2 meses)
    let candidatos = pool.filter((p) => !titulosActuales.has(p.titulo) && !usados.has(p.titulo));

    // Si el pool está casi agotado: relajar solo el filtro de recientes (no el del mes actual)
    if (candidatos.length < faltan) {
      candidatos = pool.filter((p) => !titulosActuales.has(p.titulo));
    }

    // Si aun así no hay suficientes (pool muy pequeño): tomar cualquiera del pool
    if (candidatos.length < faltan) {
      candidatos = pool;
    }

    const elegidos = mezclar(candidatos).slice(0, faltan);
    await Vale.insertMany(
      elegidos.map(({ titulo, descripcion }) => ({
        titulo,
        descripcion: descripcion || '',
        tipo: 'mensual',
        estado: 'disponible',
        periodo,
        mes: 0,
        usuario,
      }))
    );
  }

  return periodo;
}

module.exports = { asegurarValesMensuales, periodoActual, POOL_FALLBACK };
