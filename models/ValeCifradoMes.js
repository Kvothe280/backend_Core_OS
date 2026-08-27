const mongoose = require('mongoose');

const valeCifradoMesSchema = new mongoose.Schema(
  {
    periodo: { type: String, required: true, unique: true },
    desbloqueado: { type: Boolean, default: false },
    recompensa: { type: String, default: '' },
    intentosFallidos: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ValeCifradoMes', valeCifradoMesSchema);
