require('dotenv').config();

const { connectDB } = require('./src/config/db');
const FechaImportante = require('./src/models/FechaImportante');

const FECHAS = [
  { titulo: 'Aniversario', fecha: '2026-02-18', tipo: 'anual', emoji: '💑', creadoPor: 'enrique' },
  { titulo: 'Cumple Karol', fecha: '2026-02-22', tipo: 'anual', emoji: '🎂', creadoPor: 'enrique' },
  { titulo: 'Cumple Enrique', fecha: '2026-09-28', tipo: 'anual', emoji: '🎂', creadoPor: 'karol' },
];

async function run() {
  await connectDB();
  for (const f of FECHAS) {
    const existe = await FechaImportante.findOne({ titulo: f.titulo });
    if (existe) {
      console.log(`Ya existe "${f.titulo}", se omite.`);
      continue;
    }
    await FechaImportante.create(f);
    console.log(`Creada: "${f.titulo}"`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
