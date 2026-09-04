function parseUbicacion(raw) {
  if (!raw) return null;
  try {
    const { lat, lng, nombre } = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      nombre: String(nombre || '').slice(0, 100),
    };
  } catch {
    return null;
  }
}

module.exports = { parseUbicacion };
