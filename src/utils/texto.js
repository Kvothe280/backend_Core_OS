function normalizar(texto) {
  return String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

module.exports = { normalizar };
