require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('./src/config/db');
const Vale = require('./src/models/Vale');
const ValePool = require('./src/models/ValePool');
const ValeEspecialPool = require('./src/models/ValeEspecialPool');
const PreguntaMensual = require('./src/models/PreguntaMensual');
const ValeEspecialMes = require('./src/models/ValeEspecialMes');
const Carta = require('./src/models/Carta');
const Recuerdo = require('./src/models/Recuerdo');
const Usuario = require('./src/models/Usuario');
const { asegurarValesMensuales } = require('./src/services/monthly');

const POOL_MENSUAL = [
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

// Premios especiales que Enrique escribe para Karol
const POOL_ESPECIAL_ENRIQUE = [
  { titulo: 'Cena de aniversario', descripcion: 'La mesa que se pide con tiempo, el plan que eliges tú.' },
  { titulo: 'Noche de películas', descripcion: 'Maratón, snacks a elegir y sin alarmas al día siguiente.' },
  { titulo: 'Día de aventura', descripcion: 'Tú propones el destino, yo me encargo del resto.' },
  { titulo: 'Vale por un masaje largo', descripcion: 'Sin prisa, con aceite y música que tú pongas.' },
  { titulo: 'Mañana libre sin planes', descripcion: 'Solo tú, yo y lo que se nos ocurra.' },
];

// Premios especiales que Karol escribe para Enrique
const POOL_ESPECIAL_KAROL = [
  { titulo: 'Tarde de videojuegos', descripcion: 'Sin interrupciones, botanas incluidas.' },
  { titulo: 'Desayuno especial', descripcion: 'Lo que más te guste, preparado con paciencia.' },
  { titulo: 'Noche de música', descripcion: 'Tu playlist, a todo volumen, con baile opcional.' },
  { titulo: 'Vale por una siesta juntos', descripcion: 'Cobija, silencio y sin culpa.' },
  { titulo: 'Plan sorpresa', descripcion: 'Yo organizo todo, tú solo disfruta.' },
];

async function seed() {
  await connectDB();

  console.log('[SEED] Limpiando colecciones…');
  await Promise.all([
    Vale.deleteMany({}),
    ValePool.deleteMany({}),
    ValeEspecialPool.deleteMany({}),
    PreguntaMensual.deleteMany({}),
    ValeEspecialMes.deleteMany({}),
    Carta.deleteMany({}),
    Recuerdo.deleteMany({}),
    Usuario.deleteMany({}),
  ]);

  // Usuarios
  await Usuario.create([{ nombre: 'enrique' }, { nombre: 'karol' }]);
  console.log('[SEED] Usuarios: enrique, karol');

  // Pool mensual compartida
  await ValePool.insertMany(POOL_MENSUAL.map((v) => ({ ...v, activo: true })));
  console.log(`[SEED] Pool mensual: ${POOL_MENSUAL.length} vales`);

  // Pools de vales especiales (secretas por usuario)
  await ValeEspecialPool.insertMany(POOL_ESPECIAL_ENRIQUE.map((v) => ({ ...v, autor: 'enrique', usadoEnPeriodos: [] })));
  await ValeEspecialPool.insertMany(POOL_ESPECIAL_KAROL.map((v) => ({ ...v, autor: 'karol', usadoEnPeriodos: [] })));
  console.log(`[SEED] Pool especial enrique: ${POOL_ESPECIAL_ENRIQUE.length} premios`);
  console.log(`[SEED] Pool especial karol: ${POOL_ESPECIAL_KAROL.length} premios`);

  // Vales mensuales (4 por usuario)
  await asegurarValesMensuales();
  console.log('[SEED] Vales mensuales: 4 por usuario');

  console.log('\n[SEED] ✓ Base de datos lista. Sistema de preguntas mensuales activo.');
  console.log('  Preguntas: se cargan días 1-12. Respuesta: días 13-18. Límite: 6 por usuario/mes.');
  console.log('  Penalización por faltantes: 1-2 ligera | 3-4 media | 5-6 grave');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
