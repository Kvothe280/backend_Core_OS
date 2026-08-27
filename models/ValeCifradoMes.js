const mongoose = require('mongoose');

const valeCifradoMesSchema = new mongoose.Schema(
  {
    periodo: { type: String, required: true },
    usuario: { type: String, enum: ['karol', 'enrique'], required: true, default: 'enrique' },
    desbloqueado: { type: Boolean, default: false },
    recompensa: { type: String, default: '' },
    intentosFallidos: { type: Number, default: 0 },
  },
  { timestamps: true }
);

valeCifradoMesSchema.index({ periodo: 1, usuario: 1 }, { unique: true });

module.exports = mongoose.model('ValeCifradoMes', valeCifradoMesSchema);
