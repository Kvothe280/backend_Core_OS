const jwt = require('jsonwebtoken');
const { JWT_SECRET, PASS_KAROL, PASS_ENRIQUE } = require('../config/env');
const { normalizar } = require('../utils/texto');

function login(req, res) {
  const { clave, usuario } = req.body;

  // Modo dev: sin contraseñas configuradas
  if (!PASS_KAROL && !PASS_ENRIQUE) {
    const u = usuario === 'karol' ? 'karol' : 'enrique';
    const token = jwt.sign({ usuario: u }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ ok: true, usuario: u, token });
  }

  const input = normalizar(clave || '');

  // Validación por usuario específico (evita que una contraseña acceda al perfil del otro)
  if (usuario === 'karol') {
    if (PASS_KAROL && input === normalizar(PASS_KAROL)) {
      const token = jwt.sign({ usuario: 'karol' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ ok: true, usuario: 'karol', token });
    }
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }
  if (usuario === 'enrique') {
    if (PASS_ENRIQUE && input === normalizar(PASS_ENRIQUE)) {
      const token = jwt.sign({ usuario: 'enrique' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ ok: true, usuario: 'enrique', token });
    }
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  res.status(400).json({ ok: false, error: 'Selecciona un perfil.' });
}

module.exports = { login };
