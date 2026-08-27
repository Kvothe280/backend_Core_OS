const mongoose = require('mongoose');

const valePoolSchema = new mongoose.Schema(
  {
    titulo:      { type: String, required: true, trim: true },
    descripcion: { type: String, default: '', trim: true },
    activo:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ValePool', valePoolSchema);
