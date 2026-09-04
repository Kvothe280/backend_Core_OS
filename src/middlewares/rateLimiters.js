const rateLimit = require('express-rate-limit');

// Rate limiting solo en login
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' },
});

module.exports = { limiterAuth };
