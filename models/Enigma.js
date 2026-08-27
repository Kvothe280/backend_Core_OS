const mongoose = require('mongoose');

const enigmaSchema = new mongoose.Schema(
  {
    orden: { type: Number, required: true },
    pregunta: { type: String, default: '', trim: true },
    respuesta: { type: String, required: true, trim: true },
    resuelto: { type: Boolean, default: false },
    periodo: { type: String, default: '' },
    usuario: { type: String, enum: ['karol', 'enrique'], default: 'enrique' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enigma', enigmaSchema);
