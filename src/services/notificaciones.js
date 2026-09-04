const { WA_CONFIG } = require('../config/whatsapp');
const { fechaHoy } = require('../utils/fechas');

console.log('[WA] Config cargada —',
  `karol: ${process.env.WA_KAROL_PHONE?.slice(-4) ?? 'SIN PHONE'} / key=${process.env.WA_KAROL_KEY ?? 'SIN KEY'}`,
  `| enrique: ${process.env.WA_ENRIQUE_PHONE?.slice(-4) ?? 'SIN PHONE'} / key=${process.env.WA_ENRIQUE_KEY ?? 'SIN KEY'}`
);

async function enviarWhatsApp(usuario, texto) {
  const cfg = WA_CONFIG[usuario];
  if (!cfg?.phone || !cfg?.key) {
    console.warn(`[WA] Sin credenciales para "${usuario}": phone=${cfg?.phone} key=${cfg?.key}`);
    return false;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cfg.phone)}&text=${encodeURIComponent(texto)}&apikey=${cfg.key}`;
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok || body.toLowerCase().includes('error') || body.toLowerCase().includes('invalid')) {
      console.error(`[WA] Fallo para "${usuario}" (${res.status}): ${body.slice(0, 200)}`);
      return false;
    }
    console.log(`[WA] OK para "${usuario}": ${body.slice(0, 80)}`);
    return true;
  } catch (err) {
    console.error(`[WA] Error de red para "${usuario}":`, err.message);
    return false;
  }
}

async function notificar(usuario, textoWa) {
  await enviarWhatsApp(usuario, textoWa);
}

// Control anti-spam mensajes: guarda la fecha del último aviso por destinatario
const ultimoAvisoMensaje = { karol: null, enrique: null };

async function notificarPrimerMensaje(destinatario, remitente) {
  const fecha = fechaHoy();
  if (ultimoAvisoMensaje[destinatario] === fecha) {
    console.log(`[WA] Anti-spam: ya se notificó a "${destinatario}" hoy, se omite.`);
    return;
  }
  ultimoAvisoMensaje[destinatario] = fecha;
  const nombreRemitente = remitente === 'karol' ? 'Karol' : 'Enrique';
  console.log(`[WA] Enviando primer-mensaje-del-día a "${destinatario}" de parte de "${remitente}"`);
  await notificar(destinatario, `💬 ${nombreRemitente} te mandó un mensaje en CORE OS. Entra para leerlo.`);
}

module.exports = { enviarWhatsApp, notificar, notificarPrimerMensaje };
