const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, enum: ['karol', 'enrique'], required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
