const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'coreos-dev-secret-changeme';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const FECHA_INICIO = process.env.FECHA_INICIO || '2026-02-18';
const PASS_KAROL = process.env.PASS_KAROL;
const PASS_ENRIQUE = process.env.PASS_ENRIQUE;

// En producción no se permite ninguno de estos defaults de conveniencia de dev —
// omitirlos abriría auth forjable (JWT_SECRET), bypass total de login (PASS_*) o CORS abierto.
if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está definida — obligatoria en producción.');
  if (!PASS_KAROL || !PASS_ENRIQUE) throw new Error('PASS_KAROL y PASS_ENRIQUE son obligatorias en producción.');
  if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL no está definida — obligatoria en producción.');
}

module.exports = { NODE_ENV, PORT, JWT_SECRET, FRONTEND_URL, FECHA_INICIO, PASS_KAROL, PASS_ENRIQUE };
