const mongoose = require('mongoose');

const perfilSchema = new mongoose.Schema(
  {
    usuario: { type: String, required: true, unique: true, enum: ['karol', 'enrique'] },
    avatarData: { type: Buffer, select: false },
    avatarMime: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Perfil', perfilSchema);
