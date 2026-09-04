const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'coreos-dev-secret-changeme';
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const FECHA_INICIO = process.env.FECHA_INICIO || '2026-02-18';
const PASS_KAROL = process.env.PASS_KAROL;
const PASS_ENRIQUE = process.env.PASS_ENRIQUE;

module.exports = { PORT, JWT_SECRET, FRONTEND_URL, FECHA_INICIO, PASS_KAROL, PASS_ENRIQUE };
