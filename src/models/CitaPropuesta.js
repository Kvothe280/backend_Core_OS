const mongoose = require('mongoose');

// estados: pendiente → aceptada → completada (genera Recuerdo)
//          pendiente → [rechazada = se borra]
//          aceptada  → cancelada (si quieren reagendar)

const citaPropuestaSchema = new mongoose.Schema(
  {
    proponente:     { type: String, enum: ['karol', 'enrique'], required: true },
    destinatario:   { type: String, enum: ['karol', 'enrique'], required: true },
    titulo:         { type: String, required: true, trim: true },
    nota:           { type: String, default: '', trim: true },
    fechaPropuesta: { type: Date, required: true },
    estado:         { type: String, enum: ['pendiente', 'aceptada', 'cancelada', 'completada'], default: 'pendiente' },
    fechaRespuesta: { type: Date, default: null },
    recuerdoId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Recuerdo', default: null },
  },
  { timestamps: true }
);

citaPropuestaSchema.index({ proponente: 1, estado: 1 });
citaPropuestaSchema.index({ destinatario: 1, estado: 1 });

module.exports = mongoose.model('CitaPropuesta', citaPropuestaSchema);
