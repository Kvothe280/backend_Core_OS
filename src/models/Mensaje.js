const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema(
  {
    autor:      { type: String, enum: ['karol', 'enrique'], required: true },
    contenido:  { type: String, default: '', trim: true },
    imagenData: { type: Buffer, select: false },
    imagenMime: { type: String, default: '' },
    imagenEnBD: { type: Boolean, default: false },
    expiraEn:   { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB borra automáticamente el documento cuando Date.now() >= expiraEn
mensajeSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Mensaje', mensajeSchema);
