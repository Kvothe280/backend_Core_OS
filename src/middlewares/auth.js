const jwt = require('jsonwebtoken');
const { JWT_SECRET, PASS_KAROL, PASS_ENRIQUE } = require('../config/env');

function verificarToken(req, res, next) {
  // Modo dev: sin contraseñas configuradas, acceso libre
  if (!PASS_KAROL && !PASS_ENRIQUE) {
    req.usuario = req.headers['x-usuario'] || 'enrique';
    req.headers['x-usuario'] = req.usuario;
    return next();
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sin sesión activa.' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.usuario = payload.usuario;
    req.headers['x-usuario'] = payload.usuario; // compatibilidad con rutas existentes
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }
}

module.exports = { verificarToken };
