const mongoose = require('mongoose');

const valeEspecialPoolSchema = new mongoose.Schema(
  {
    titulo:            { type: String, required: true, trim: true },
    descripcion:       { type: String, default: '', trim: true },
    autor:             { type: String, enum: ['karol', 'enrique'], required: true },
    usadoEnPeriodos:   [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ValeEspecialPool', valeEspecialPoolSchema);
