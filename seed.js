require('dotenv').config();

const { connectDB } = require('./db');
const Vale = require('./models/Vale');
const Enigma = require('./models/Enigma');
const { asegurarValesMensuales } = require('./monthly');

/**
 * Preguntas: déjalas vacías o edítalas cuando quieras.
 * Claves de prueba (sin acentos, da igual mayúsculas):
 *   Enigma 1 → clave1
 *   Enigma 2 → clave2
 *   Enigma 3 → clave3
 *   Enigma 4 → clave4
 *   Enigma 5 → clave5
 *   Enigma 6 → clave6
 */
const PROTOCOLO = [
  {
    orden: 1,
    pregunta: '',
    respuesta: 'clave1',
    vale: {
      titulo: 'Vale por una cita sorpresa',
      descripcion: 'Tú eliges el día. Yo me encargo del resto.',
      tipo: 'especial',
    },
  },
  {
    orden: 2,
    pregunta: '',
    respuesta: 'clave2',
    vale: {
      titulo: 'Vale por una noche de juegos',
      descripcion: 'Maratón, snacks y sin alarmas al día siguiente.',
      tipo: 'gratis',
    },
  },
  {
    orden: 3,
    pregunta: '',
    respuesta: 'clave3',
    vale: {
      titulo: 'Vale por un café a tu manera',
      descripcion: 'El que pidas, cuando pidas.',
      tipo: 'gratis',
    },
  },
  {
    orden: 4,
    pregunta: '',
    respuesta: 'clave4',
    vale: {
      titulo: 'Vale por un masaje',
      descripcion: 'Sin prisa. Música baja.',
      tipo: 'especial',
    },
  },
  {
    orden: 5,
    pregunta: '',
    respuesta: 'clave5',
    vale: {
      titulo: 'Vale por una película y cobija',
      descripcion: 'Tú pones el título.',
      tipo: 'gratis',
    },
  },
  {
    orden: 6,
    pregunta: '',
    respuesta: 'clave6',
    vale: {
      titulo: 'Cena especial de Aniversario',
      descripcion: 'La mesa que se pide con tiempo.',
      tipo: 'especial',
    },
  },
];

async function seed() {
  await connectDB();

  await Vale.deleteMany({ tipo: { $ne: 'mensual' } });
  await Vale.deleteMany({ tipo: 'mensual', estado: { $ne: 'canjeado' } });
  await Enigma.deleteMany({});

  // Crear enigmas para ambos usuarios
  for (const usuario of ['enrique', 'karol']) {
    for (const item of PROTOCOLO) {
      const enigma = await Enigma.create({
        orden: item.orden,
        pregunta: item.pregunta,
        respuesta: `${item.respuesta}_${usuario}`,
        usuario,
        resuelto: false,
      });

      if (usuario === 'enrique') {
        await Vale.create({
          ...item.vale,
          mes: item.orden,
          estado: 'bloqueado',
          enigmaId: enigma._id,
        });
      }
    }
  }

  await asegurarValesMensuales();

  console.log('[CORE OS] Seed listo.');
  console.log('Claves enrique: clave1_enrique … clave6_enrique');
  console.log('Claves karol:   clave1_karol … clave6_karol');
  console.log('Las cartas y recuerdos no se borran.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('[CORE OS] Error en seed:', error);
  process.exit(1);
});
