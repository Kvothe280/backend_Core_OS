const mongoose = require('mongoose');

const preguntaMensualSchema = new mongoose.Schema(
  {
    pregunta:        { type: String, required: true, trim: true },
    respuesta:       { type: String, required: true, trim: true },
    autor:           { type: String, enum: ['karol', 'enrique'], required: true },
    periodo:         { type: String, required: true },
    orden:           { type: Number, required: true },
    respondida:      { type: Boolean, default: false },
    fechaRespuesta:  { type: Date, default: null },
  },
  { timestamps: true }
);

preguntaMensualSchema.index({ autor: 1, periodo: 1, orden: 1 });

module.exports = mongoose.model('PreguntaMensual', preguntaMensualSchema);
