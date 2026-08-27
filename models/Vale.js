const mongoose = require('mongoose');

const valeSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      default: '',
    },
    imagen: {
      type: String,
      default: '',
    },
    mes: {
      type: Number,
      default: 0,
    },
    periodo: {
      type: String,
      default: '',
    },
    tipo: {
      type: String,
      enum: ['gratis', 'especial', 'mensual'],
      required: true,
    },
    estado: {
      type: String,
      enum: ['disponible', 'bloqueado', 'canjeado'],
      default: 'bloqueado',
    },
    usuario: {
      type: String,
      enum: ['karol', 'enrique'],
      default: 'enrique',
    },
    enigmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enigma',
      default: null,
    },
    detalles_canje: {
      fecha: {
        type: Date,
        default: null,
      },
      notas: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vale', valeSchema);
