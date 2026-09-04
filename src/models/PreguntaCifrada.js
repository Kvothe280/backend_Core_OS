const mongoose = require('mongoose');

const preguntaCifradaSchema = new mongoose.Schema(
  {
    orden: { type: Number, required: true },
    pregunta: { type: String, required: true, trim: true },
    respuesta: { type: String, required: true, trim: true },
    usada: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PreguntaCifrada', preguntaCifradaSchema);
