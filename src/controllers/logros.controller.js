const { calcularLogros } = require('../services/logros');

async function listar(_req, res) {
  try {
    res.json(await calcularLogros());
  } catch {
    res.status(500).json({ error: 'No se pudieron calcular los logros.' });
  }
}

module.exports = { listar };
