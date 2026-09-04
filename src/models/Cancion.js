const mongoose = require('mongoose');

const cancionSchema = new mongoose.Schema({
  usuario: { type: String, enum: ['karol', 'enrique'], required: true },
  titulo:  { type: String, required: true },
  artista: { type: String, default: '' },
  url:     { type: String, default: '' },
  semana:  { type: String, required: true }, // 'YYYY-WW'
}, { timestamps: true });

cancionSchema.index({ usuario: 1, semana: 1 }, { unique: true });

module.exports = mongoose.model('Cancion', cancionSchema);
