const Usuario = require('../models/Usuario');

async function listar(_req, res) {
  try { res.json(await Usuario.find()); }
  catch { res.status(500).json({ error: 'Error.' }); }
}

module.exports = { listar };
