const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  usuario: { type: String, enum: ['karol', 'enrique'], required: true },
  emoji:   { type: String, required: true },
  nota:    { type: String, default: '' },
  fecha:   { type: String, required: true }, // 'YYYY-MM-DD'
}, { timestamps: true });

// Un registro por usuario por día
moodSchema.index({ usuario: 1, fecha: 1 }, { unique: true });

module.exports = mongoose.model('MoodEntry', moodSchema);
