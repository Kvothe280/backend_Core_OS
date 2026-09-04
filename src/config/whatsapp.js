// Configuración por usuario (en .env):
//   WA_KAROL_PHONE   = +521XXXXXXXXXX
//   WA_KAROL_KEY     = (API key de CallMeBot de Karol)
//   WA_ENRIQUE_PHONE = +521XXXXXXXXXX
//   WA_ENRIQUE_KEY   = (API key de CallMeBot de Enrique)

const WA_CONFIG = {
  karol:   { phone: process.env.WA_KAROL_PHONE,   key: process.env.WA_KAROL_KEY },
  enrique: { phone: process.env.WA_ENRIQUE_PHONE, key: process.env.WA_ENRIQUE_KEY },
};

module.exports = { WA_CONFIG };
