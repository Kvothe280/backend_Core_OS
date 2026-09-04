const Cancion = require('../models/Cancion');
const { semanaActual } = require('../utils/fechas');

async function getCanciones(req, res) {
  try {
    const semana = semanaActual();
    const docs = await Cancion.find({ semana });
    const resultado = { karol: null, enrique: null };
    for (const c of docs) resultado[c.usuario] = c;
    res.json(resultado);
  } catch { res.status(500).json({ error: 'Error al obtener canciones.' }); }
}

async function postCancion(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { titulo, artista, url } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es requerido.' });
    const semana = semanaActual();
    const doc = await Cancion.findOneAndUpdate(
      { usuario, semana },
      { titulo: String(titulo).slice(0, 100), artista: String(artista || '').slice(0, 80), url: String(url || '').slice(0, 300) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch { res.status(500).json({ error: 'Error al guardar canción.' }); }
}

module.exports = { getCanciones, postCancion };
