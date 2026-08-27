require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Vale = require('./models/Vale');
const ValePool = require('./models/ValePool');
const Enigma = require('./models/Enigma');
const PreguntaCifrada = require('./models/PreguntaCifrada');
const ValeCifradoMes = require('./models/ValeCifradoMes');
const Carta = require('./models/Carta');
const Recuerdo = require('./models/Recuerdo');
const Usuario = require('./models/Usuario');
const { asegurarValesMensuales } = require('./monthly');

// ── Enigmas de prueba (3 con pregunta, 3 vacíos) ──────────────────────────
const PREGUNTAS_TEST = [
  { orden: 1, pregunta: '¿Cuál fue la primera película que vimos juntos?' },
  { orden: 2, pregunta: '¿En qué mes empezamos?' },
  { orden: 3, pregunta: '¿Cuál es el apodo que me pusiste?' },
];

// ── Vales especiales ligados a enigmas ────────────────────────────────────
const PROTOCOLO_VALES = [
  { orden: 1, titulo: 'Vale por una cita sorpresa',      descripcion: 'Tú eliges el día. Yo me encargo del resto.',         tipo: 'especial' },
  { orden: 2, titulo: 'Vale por una noche de juegos',    descripcion: 'Maratón, snacks y sin alarmas al día siguiente.',    tipo: 'gratis'   },
  { orden: 3, titulo: 'Vale por un café a tu manera',    descripcion: 'El que pidas, cuando pidas.',                        tipo: 'gratis'   },
  { orden: 4, titulo: 'Vale por un masaje',              descripcion: 'Sin prisa. Música baja.',                             tipo: 'especial' },
  { orden: 5, titulo: 'Vale por una película y cobija',  descripcion: 'Tú pones el título.',                                tipo: 'gratis'   },
  { orden: 6, titulo: 'Cena especial de Aniversario',    descripcion: 'La mesa que se pide con tiempo.',                    tipo: 'especial' },
];

// ── Pool de vales mensuales (se puede gestionar desde el panel admin) ─────
const POOL_INICIAL = [
  { titulo: 'Vale por un café juntos',          descripcion: 'El de siempre, o uno nuevo.' },
  { titulo: 'Vale por una caminata',             descripcion: 'Sin prisa y sin celular de por medio.' },
  { titulo: 'Vale por una película',             descripcion: 'Tú eliges el título.' },
  { titulo: 'Vale por cocinar juntos',           descripcion: 'Una receta, cuatro manos.' },
  { titulo: 'Vale por un masaje corto',          descripcion: 'Veinte minutos, música baja.' },
  { titulo: 'Vale por desayuno en cama',         descripcion: 'Lo más simple cuenta.' },
  { titulo: 'Vale por elegir la música del día', descripcion: 'Playlist completa, sin veto.' },
  { titulo: 'Vale por una cita sorpresa',        descripcion: 'El otro arma el plan.' },
  { titulo: 'Vale por quedarnos en pijama',      descripcion: 'Cero planes afuera.' },
  { titulo: 'Vale por un helado',                descripcion: 'El sabor que pidas.' },
  { titulo: 'Vale por una foto juntos',          descripcion: 'Aunque sea con el frente de la casa.' },
  { titulo: 'Vale por una carta corta',          descripcion: 'Papel o digital, pero hoy.' },
];

// ── Preguntas del vale cifrado ─────────────────────────────────────────────
const PREGUNTAS_CIFRADO_TEST = [
  { orden: 1, pregunta: '¿Cómo se llama el lugar de nuestra primera cita?',  respuesta: 'cifrado1' },
  { orden: 2, pregunta: '¿Cuál es la canción que más nos recuerda?',          respuesta: 'cifrado2' },
  { orden: 3, pregunta: '¿Qué plato te preparo la primera vez?',              respuesta: 'cifrado3' },
];

async function seed() {
  await connectDB();

  console.log('[SEED] Limpiando TODAS las colecciones…');
  await Promise.all([
    Vale.deleteMany({}),
    ValePool.deleteMany({}),
    Enigma.deleteMany({}),
    PreguntaCifrada.deleteMany({}),
    ValeCifradoMes.deleteMany({}),
    Carta.deleteMany({}),
    Recuerdo.deleteMany({}),
    Usuario.deleteMany({}),
  ]);

  // Usuarios
  await Usuario.create([{ nombre: 'enrique' }, { nombre: 'karol' }]);
  console.log('[SEED] Usuarios: enrique, karol');

  // Pool mensual
  await ValePool.insertMany(POOL_INICIAL.map((v) => ({ ...v, activo: true })));
  console.log(`[SEED] Pool mensual: ${POOL_INICIAL.length} vales`);

  // Enigmas + vales especiales por usuario
  for (const usuario of ['enrique', 'karol']) {
    const sufijo = usuario === 'enrique' ? 'e' : 'k';

    for (const vale of PROTOCOLO_VALES) {
      const test = PREGUNTAS_TEST.find((p) => p.orden === vale.orden);
      const enigma = await Enigma.create({
        orden: vale.orden,
        pregunta: test?.pregunta || '',
        respuesta: test ? `${sufijo}${vale.orden}` : `clave${vale.orden}${sufijo}`,
        usuario,
        resuelto: false,
      });
      await Vale.create({ ...vale, mes: vale.orden, estado: 'bloqueado', enigmaId: enigma._id, usuario });
    }
    console.log(`[SEED] ${usuario}: 3 enigmas con pregunta (${sufijo}1/${sufijo}2/${sufijo}3) + 3 vacíos`);
  }

  // Preguntas del vale cifrado
  await PreguntaCifrada.insertMany(PREGUNTAS_CIFRADO_TEST);
  console.log('[SEED] PreguntasCifradas: cifrado1, cifrado2, cifrado3');

  // Vales mensuales (4 por usuario)
  await asegurarValesMensuales();
  console.log('[SEED] Vales mensuales generados: 4 por usuario');

  console.log('\n[SEED] ✓ Base de datos limpia y lista.');
  console.log('  Claves enigmas Enrique: e1, e2, e3 (4-6 vacíos)');
  console.log('  Claves enigmas Karol:   k1, k2, k3 (4-6 vacíos)');
  console.log('  Claves vale cifrado:    cifrado1, cifrado2, cifrado3');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
