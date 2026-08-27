const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida en el entorno.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[CORE OS] Conexión a MongoDB establecida.');
}

module.exports = { connectDB };
