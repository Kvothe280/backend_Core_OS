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
    ubicacion: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        nombre: { type: String, default: '', trim: true },
      },
      default: undefined,
      _id: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recuerdo', recuerdoSchema);
