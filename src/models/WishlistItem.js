const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  texto:    { type: String, required: true },
  hecho:    { type: Boolean, default: false },
  creadoPor:{ type: String, enum: ['karol', 'enrique'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('WishlistItem', wishlistSchema);
