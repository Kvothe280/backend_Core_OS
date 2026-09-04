const Perfil = require('../models/Perfil');

// Sube o reemplaza el avatar del usuario actual
async function postAvatar(req, res) {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    if (!req.file?.buffer) return res.status(400).json({ error: 'Falta la imagen.' });
    await Perfil.findOneAndUpdate(
      { usuario },
      { avatarData: req.file.buffer, avatarMime: req.file.mimetype },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, avatar: `/api/avatar/${usuario}?t=${Date.now()}` });
  } catch { res.status(500).json({ error: 'No se pudo guardar el avatar.' }); }
}

module.exports = { postAvatar };
