const mongoose = require('mongoose');

const recuerdoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    nota: { type: String, default: '' },
    tipo: { type: String, default: 'recuerdo' },
    fecha: { type: Date, default: Date.now },
    imagen: { type: String, default: '' },
    imagenData: { type: Buffer, select: false },
    imagenMime: { type: String, default: '' },
    imagenEnBD: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recuerdo', recuerdoSchema);
