const Carta = require('../models/Carta');
const Recuerdo = require('../models/Recuerdo');
const Mensaje = require('../models/Mensaje');
const Perfil = require('../models/Perfil');

async function getImagenCarta(req, res) {
  try {
    const carta = await Carta.findById(req.params.id).select('+imagenData');
    if (!carta?.imagenData) return res.status(404).end();
    res.set('Content-Type', carta.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(carta.imagenData);
  } catch { res.status(404).end(); }
}

async function getImagenRecuerdo(req, res) {
  try {
    const recuerdo = await Recuerdo.findById(req.params.id).select('+imagenData');
    if (!recuerdo?.imagenData) return res.status(404).end();
    res.set('Content-Type', recuerdo.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(recuerdo.imagenData);
  } catch { res.status(404).end(); }
}

async function getImagenMensaje(req, res) {
  try {
    const m = await Mensaje.findById(req.params.id).select('+imagenData');
    if (!m?.imagenData) return res.status(404).end();
    res.set('Content-Type', m.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=86400');
    res.send(m.imagenData);
  } catch { res.status(500).end(); }
}

async function getAvatar(req, res) {
  try {
    const perfil = await Perfil.findOne({ usuario: req.params.usuario }).select('+avatarData');
    if (!perfil?.avatarData) return res.status(404).end();
    res.set('Content-Type', perfil.avatarMime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(perfil.avatarData);
  } catch { res.status(404).end(); }
}

module.exports = { getImagenCarta, getImagenRecuerdo, getImagenMensaje, getAvatar };
