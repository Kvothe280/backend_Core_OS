const mongoose = require('mongoose');

const preguntaCifradaSchema = new mongoose.Schema(
  {
    orden: { type: Number, required: true },
    pregunta: { type: String, required: true, trim: true },
    respuesta: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PreguntaCifrada', preguntaCifradaSchema);
