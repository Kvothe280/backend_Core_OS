require('dotenv').config();

const { connectDB } = require('./db');
const Vale = require('./models/Vale');
const Enigma = require('./models/Enigma');
const PreguntaCifrada = require('./models/PreguntaCifrada');
const { asegurarValesMensuales } = require('./monthly');

// 3 enigmas con pregunta + clave de prueba, 3 vacíos para cargar manualmente
// Claves: e1/e2/e3 para Enrique, k1/k2/k3 para Karol
const PREGUNTAS_TEST = [
  { orden: 1, pregunta: '¿Cuál fue la primera película que vimos juntos?' },
  { orden: 2, pregunta: '¿En qué mes empezamos?' },
  { orden: 3, pregunta: '¿Cuál es el apodo que me pusiste?' },
];

const PROTOCOLO_VALES = [
  { orden: 1, titulo: 'Vale por una cita sorpresa',      descripcion: 'Tú eliges el día. Yo me encargo del resto.',          tipo: 'especial' },
  { orden: 2, titulo: 'Vale por una noche de juegos',    descripcion: 'Maratón, snacks y sin alarmas al día siguiente.',     tipo: 'gratis'   },
  { orden: 3, titulo: 'Vale por un café a tu manera',    descripcion: 'El que pidas, cuando pidas.',                         tipo: 'gratis'   },
  { orden: 4, titulo: 'Vale por un masaje',              descripcion: 'Sin prisa. Música baja.',                              tipo: 'especial' },
  { orden: 5, titulo: 'Vale por una película y cobija',  descripcion: 'Tú pones el título.',                                 tipo: 'gratis'   },
  { orden: 6, titulo: 'Cena especial de Aniversario',    descripcion: 'La mesa que se pide con tiempo.',                     tipo: 'especial' },
];

// 3 preguntas del vale cifrado (Karol las responde con [2] en la terminal)
const PREGUNTAS_CIFRADO_TEST = [
  { orden: 1, pregunta: '¿Cómo se llama el lugar de nuestra primera cita?',  respuesta: 'cifrado1' },
  { orden: 2, pregunta: '¿Cuál es la canción que más nos recuerda?',          respuesta: 'cifrado2' },
  { orden: 3, pregunta: '¿Qué plato te preparo la primera vez?',              respuesta: 'cifrado3' },
];

async function seed() {
  await connectDB();

  await Vale.deleteMany({ tipo: { $ne: 'mensual' } });
  await Vale.deleteMany({ tipo: 'mensual', estado: { $ne: 'canjeado' } });
  await Enigma.deleteMany({});
  await PreguntaCifrada.deleteMany({});

  // ── Enigmas: 3 con pregunta de prueba + 3 vacíos, para cada usuario ────────
  for (const usuario of ['enrique', 'karol']) {
    const sufijo = usuario === 'enrique' ? 'e' : 'k';

    for (const vale of PROTOCOLO_VALES) {
      const test = PREGUNTAS_TEST.find((p) => p.orden === vale.orden);
      const enigma = await Enigma.create({
        orden: vale.orden,
        pregunta: test?.pregunta || '',           // 1-3 con pregunta, 4-6 vacíos
        respuesta: test ? `${sufijo}${vale.orden}` : `clave${vale.orden}${sufijo}`,
        usuario,
        resuelto: false,
      });

      await Vale.create({ ...vale, mes: vale.orden, estado: 'bloqueado', enigmaId: enigma._id, usuario });
    }
  }

  // ── Preguntas cifradas (globales, Karol las responde) ──────────────────────
  for (const p of PREGUNTAS_CIFRADO_TEST) {
    await PreguntaCifrada.create(p);
  }

  await asegurarValesMensuales();

  console.log('[CORE OS] Seed listo.');
  console.log('Enigmas Enrique  (3 cargados): e1, e2, e3');
  console.log('Enigmas Karol    (3 cargados): k1, k2, k3');
  console.log('Enigmas 4-6 de cada usuario: vacíos — cargar en [admin]');
  console.log('Preguntas cifradas (3): cifrado1, cifrado2, cifrado3');
  console.log('Cartas y recuerdos no se borran.');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
