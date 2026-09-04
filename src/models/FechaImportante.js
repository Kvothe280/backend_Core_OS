const mongoose = require('mongoose');

const fechaImportanteSchema = new mongoose.Schema({
  titulo:    { type: String, required: true },
  fecha:     { type: Date, required: true },
  tipo:      { type: String, enum: ['unica', 'anual'], required: true },
  emoji:     { type: String, default: '📌' },
  creadoPor: { type: String, enum: ['karol', 'enrique'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('FechaImportante', fechaImportanteSchema);
