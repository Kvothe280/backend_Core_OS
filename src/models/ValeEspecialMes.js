const mongoose = require('mongoose');

// estados:
//   pendiente     → esperando que se respondan las preguntas
//   desbloqueado  → todas las preguntas respondidas antes del día 18
//   compensacion  → el autor no cargó preguntas, el destinatario recibe el vale sin responder
//   inutilizado   → llegó el día 18 sin completar todas las preguntas
//   canjeado      → el destinatario ya lo usó

const valeEspecialMesSchema = new mongoose.Schema(
  {
    periodo:            { type: String, required: true },
    destinatario:       { type: String, enum: ['karol', 'enrique'], required: true },
    autor:              { type: String, enum: ['karol', 'enrique'], required: true },
    valeEspecialPoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'ValeEspecialPool', default: null },
    titulo:             { type: String, default: '' },
    descripcion:        { type: String, default: '' },
    estado:             { type: String, enum: ['pendiente', 'desbloqueado', 'compensacion', 'inutilizado', 'canjeado'], default: 'pendiente' },
    penalizacion:       { type: String, enum: ['ligera', 'media', 'grave', null], default: null },
    fechaDesbloqueo:    { type: Date, default: null },
    fechaVencimiento:   { type: Date, default: null },
    fechaCanje:         { type: Date, default: null },
  },
  { timestamps: true }
);

valeEspecialMesSchema.index({ periodo: 1, destinatario: 1 }, { unique: true });

module.exports = mongoose.model('ValeEspecialMes', valeEspecialMesSchema);
