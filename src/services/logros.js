const Carta = require('../models/Carta');
const Recuerdo = require('../models/Recuerdo');

// Mismo criterio que el dashboard (utils/estadisticas.js#esCita): 'cafe' es un
// tipo legado normalizado a 'cita' al editar, pero registros viejos sin editar
// pueden seguir teniéndolo tal cual en la BD.
const TIPOS_CITA = ['cita', 'cafe'];

// Compartidos por la pareja, calculados al vuelo (sin modelo propio): cada logro
// es un umbral sobre un conteo que ya existe en otra colección. La fecha de
// desbloqueo se deriva del createdAt del N-ésimo elemento — no hace falta
// persistir nada ni enganchar hooks en 3 controllers distintos.
const CATALOGO = [
  {
    categoria: 'cartas',
    label: 'Cartas',
    emoji: '💌',
    tiers: [
      { umbral: 1, titulo: 'Primera carta' },
      { umbral: 5, titulo: '5 cartas escritas' },
      { umbral: 10, titulo: '10 cartas escritas' },
    ],
  },
  {
    categoria: 'citas',
    label: 'Citas',
    emoji: '📅',
    tiers: [
      { umbral: 1, titulo: 'Primera cita' },
      { umbral: 5, titulo: '5 citas' },
      { umbral: 10, titulo: '10 citas' },
    ],
  },
  {
    categoria: 'recuerdos',
    label: 'Recuerdos',
    emoji: '📸',
    tiers: [
      { umbral: 1, titulo: 'Primer recuerdo' },
      { umbral: 10, titulo: '10 recuerdos' },
      { umbral: 25, titulo: '25 recuerdos' },
    ],
  },
];

async function calcularLogros() {
  const [cartas, citas, recuerdos] = await Promise.all([
    Carta.find().sort({ createdAt: 1 }).select('createdAt').lean(),
    Recuerdo.find({ tipo: { $in: TIPOS_CITA } }).sort({ createdAt: 1 }).select('createdAt').lean(),
    Recuerdo.find({ tipo: { $nin: TIPOS_CITA } }).sort({ createdAt: 1 }).select('createdAt').lean(),
  ]);
  const fuentes = { cartas, citas, recuerdos };

  let totalDesbloqueados = 0;
  let totalLogros = 0;

  const categorias = CATALOGO.map((cat) => {
    const docs = fuentes[cat.categoria];
    const conteoActual = docs.length;
    const tiers = cat.tiers.map((t) => {
      totalLogros += 1;
      const desbloqueado = conteoActual >= t.umbral;
      if (desbloqueado) totalDesbloqueados += 1;
      return {
        id: `${cat.categoria}-${t.umbral}`,
        umbral: t.umbral,
        titulo: t.titulo,
        desbloqueado,
        fecha: desbloqueado ? docs[t.umbral - 1].createdAt : null,
      };
    });
    return { id: cat.categoria, label: cat.label, emoji: cat.emoji, conteoActual, tiers };
  });

  return { categorias, totalDesbloqueados, totalLogros };
}

module.exports = { calcularLogros };
