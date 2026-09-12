require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { asegurarValesMensuales } = require('./src/services/monthly');
const { iniciarNotificacionesDiarias } = require('./src/services/notificacionesDiarias');
const { PORT } = require('./src/config/env');

async function start() {
  await connectDB();
  await asegurarValesMensuales();
  iniciarNotificacionesDiarias();
  app.listen(PORT, () => console.log(`[CORE OS] API escuchando en http://localhost:${PORT}`));
}

start().catch((error) => { console.error('[CORE OS] Fallo al iniciar:', error); process.exit(1); });
