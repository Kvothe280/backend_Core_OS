const MoodEntry = require('../models/MoodEntry');
const { fechaHoy } = require('../utils/fechas');

// Devuelve el estado de ánimo de hoy para ambos usuarios
async function getMood(req, res) {
  try {
    const hoy = fechaHoy();
    const entradas = await MoodEntry.find({ fecha: hoy }).select('-__v');
    const resultado = { karol: null, enrique: null };
    for (const e of entradas) resultado[e.usuario] = e;
    res.json(resultado);
  } catch { res.status(500).json({ error: 'No se pudo obtener el estado de ánimo.' }); }
}

// Registra o actualiza el estado de ánimo de hoy del usuario actual
async function postMood(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { emoji, nota } = req.body;
    if (!emoji) return res.status(400).json({ error: 'El emoji es requerido.' });
    const hoy = fechaHoy();
    const entrada = await MoodEntry.findOneAndUpdate(
      { usuario, fecha: hoy },
      { emoji, nota: String(nota || '').slice(0, 120) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(entrada);
  } catch { res.status(500).json({ error: 'No se pudo guardar el estado de ánimo.' }); }
}

module.exports = { getMood, postMood };
