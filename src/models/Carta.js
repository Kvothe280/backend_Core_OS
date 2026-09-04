const mongoose = require('mongoose');

const cartaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    cuerpo: { type: String, default: '' },
    autor: { type: String, required: true, trim: true },
    para: { type: String, default: '' },
    fecha: { type: Date, default: null },
    imagen: { type: String, default: '' },
    imagenData: { type: Buffer, select: false },
    imagenMime: { type: String, default: '' },
    imagenEnBD: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carta', cartaSchema);
