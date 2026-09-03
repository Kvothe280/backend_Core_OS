require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
// discord.js removido — notificaciones via WhatsApp (CallMeBot)
const { connectDB } = require('./db');
const { upload, comprimirArchivo } = require('./upload');
const { asegurarValesMensuales, periodoActual } = require('./monthly');
const Vale = require('./models/Vale');
const ValePool = require('./models/ValePool');
const ValeEspecialPool = require('./models/ValeEspecialPool');
const PreguntaMensual = require('./models/PreguntaMensual');
const ValeEspecialMes = require('./models/ValeEspecialMes');
const Carta = require('./models/Carta');
const Recuerdo = require('./models/Recuerdo');
const CitaPropuesta = require('./models/CitaPropuesta');
const Usuario = require('./models/Usuario');
const Mensaje = require('./models/Mensaje');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'coreos-dev-secret-changeme';

// ── Seguridad — headers HTTP ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ── Rate limiting solo en login ────────────────────────────────────────────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' },
});

// ── Middleware JWT ─────────────────────────────────────────────────────────
function verificarToken(req, res, next) {
  // Modo dev: sin contraseñas configuradas, acceso libre
  if (!process.env.PASS_KAROL && !process.env.PASS_ENRIQUE) {
    req.usuario = req.headers['x-usuario'] || 'enrique';
    req.headers['x-usuario'] = req.usuario;
    return next();
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sin sesión activa.' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.usuario = payload.usuario;
    req.headers['x-usuario'] = payload.usuario; // compatibilidad con rutas existentes
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }
}

// ── Helper: medianoche del día siguiente ───────────────────────────────────
function proximaMedianoche() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizar(texto) {
  return String(texto || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function diasDesde(fechaIso) {
  const inicio = new Date(`${fechaIso}T00:00:00`);
  const ms = Date.now() - inicio.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function diaActual() {
  return new Date().getDate();
}

function otroUsuario(usuario) {
  return usuario === 'karol' ? 'enrique' : 'karol';
}

function ultimos3Periodos(periodo) {
  const [year, month] = periodo.split('-').map(Number);
  return [1, 2, 3].map((i) => {
    let m = month - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    return `${y}-${String(m).padStart(2, '0')}`;
  });
}

function calcularPenalizacion(faltantes) {
  if (faltantes >= 5) return 'grave';
  if (faltantes >= 3) return 'media';
  if (faltantes >= 1) return 'ligera';
  return null;
}

async function seleccionarValeEspecial(autor, periodo) {
  const blackout = ultimos3Periodos(periodo);
  let candidatos = await ValeEspecialPool.find({ autor, usadoEnPeriodos: { $nin: blackout } }).lean();
  if (!candidatos.length) {
    // Pool agotado: usar los más antiguos (menos veces usados)
    candidatos = await ValeEspecialPool.find({ autor }).sort({ 'usadoEnPeriodos.length': 1 }).lean();
  }
  if (!candidatos.length) return null;
  const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  await ValeEspecialPool.findByIdAndUpdate(elegido._id, { $push: { usadoEnPeriodos: periodo } });
  return elegido;
}

// Verifica y actualiza el estado del ValeEspecialMes del destinatario al consultarlo
async function verificarEstadoEspecial(periodo, destinatario) {
  const dia = diaActual();
  const autor = otroUsuario(destinatario);
  let vem = await ValeEspecialMes.findOne({ periodo, destinatario });

  // Si ya tiene estado final, no hacer nada
  if (vem && ['desbloqueado', 'compensacion', 'inutilizado', 'canjeado'].includes(vem.estado)) {
    return vem;
  }

  const preguntasAutor = await PreguntaMensual.find({ autor, periodo }).sort({ orden: 1 });
  const total = preguntasAutor.length;
  const faltantes = 6 - total;

  // Si es día 13+ y el autor no cargó preguntas → compensación automática
  if (dia >= 13 && total === 0) {
    if (!vem) {
      const vale = await seleccionarValeEspecial(autor, periodo);
      vem = await ValeEspecialMes.create({
        periodo, destinatario, autor,
        valeEspecialPoolId: vale?._id || null,
        titulo: vale?.titulo || 'Vale compensación',
        descripcion: vale?.descripcion || '',
        estado: 'compensacion',
        penalizacion: 'grave',
        fechaDesbloqueo: new Date(),
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
    return vem;
  }

  // Si pasó el día 18 y no está completo → inutilizar
  if (dia > 18) {
    const respondidas = preguntasAutor.filter((p) => p.respondida).length;
    if (respondidas < total || total < 6) {
      if (!vem) {
        vem = await ValeEspecialMes.create({
          periodo, destinatario, autor,
          estado: 'inutilizado',
          penalizacion: calcularPenalizacion(faltantes),
        });
      } else if (vem.estado === 'pendiente') {
        vem.estado = 'inutilizado';
        vem.penalizacion = calcularPenalizacion(faltantes);
        await vem.save();
      }
      return vem;
    }
  }

  return vem;
}

function esCita(r) {
  return r.tipo === 'cita' || r.tipo === 'cafe';
}

function serieMensual(cartas, recuerdos) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ahora = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    return {
      mes: meses[m],
      cartas: cartas.filter((c) => { const f = new Date(c.createdAt); return f.getFullYear() === y && f.getMonth() === m; }).length,
      citas: recuerdos.filter((r) => { const f = new Date(r.fecha || r.createdAt); return esCita(r) && f.getFullYear() === y && f.getMonth() === m; }).length,
    };
  });
}

// ── Notificaciones WhatsApp (CallMeBot) ────────────────────────────────────

// Configuración por usuario (en .env):
//   WA_KAROL_PHONE   = +521XXXXXXXXXX
//   WA_KAROL_KEY     = (API key de CallMeBot de Karol)
//   WA_ENRIQUE_PHONE = +521XXXXXXXXXX
//   WA_ENRIQUE_KEY   = (API key de CallMeBot de Enrique)

const WA_CONFIG = {
  karol:   { phone: process.env.WA_KAROL_PHONE,   key: process.env.WA_KAROL_KEY },
  enrique: { phone: process.env.WA_ENRIQUE_PHONE, key: process.env.WA_ENRIQUE_KEY },
};
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

async function notificarPrimerMensaje(destinatario, remitente) {
  const fecha = hoy();
  if (ultimoAvisoMensaje[destinatario] === fecha) {
    console.log(`[WA] Anti-spam: ya se notificó a "${destinatario}" hoy, se omite.`);
    return;
  }
  ultimoAvisoMensaje[destinatario] = fecha;
  const nombreRemitente = remitente === 'karol' ? 'Karol' : 'Enrique';
  console.log(`[WA] Enviando primer-mensaje-del-día a "${destinatario}" de parte de "${remitente}"`);
  await notificar(destinatario, `💬 ${nombreRemitente} te mandó un mensaje en CORE OS. Entra para leerlo.`);
}

// ── Autenticación (sin token requerido) ───────────────────────────────────

app.post('/api/auth/login', limiterAuth, (req, res) => {
  const { clave, usuario } = req.body;
  const passKarol   = process.env.PASS_KAROL;
  const passEnrique = process.env.PASS_ENRIQUE;

  // Modo dev: sin contraseñas configuradas
  if (!passKarol && !passEnrique) {
    const u = usuario === 'karol' ? 'karol' : 'enrique';
    const token = jwt.sign({ usuario: u }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ ok: true, usuario: u, token });
  }

  const input = normalizar(clave || '');

  // Validación por usuario específico (evita que una contraseña acceda al perfil del otro)
  if (usuario === 'karol') {
    if (passKarol && input === normalizar(passKarol)) {
      const token = jwt.sign({ usuario: 'karol' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ ok: true, usuario: 'karol', token });
    }
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }
  if (usuario === 'enrique') {
    if (passEnrique && input === normalizar(passEnrique)) {
      const token = jwt.sign({ usuario: 'enrique' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ ok: true, usuario: 'enrique', token });
    }
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }

  res.status(400).json({ ok: false, error: 'Selecciona un perfil.' });
});

// ── Todas las rutas siguientes requieren token ─────────────────────────────
app.use('/api', verificarToken);

// ── Dashboard ──────────────────────────────────────────────────────────────

app.get('/api/dashboard', async (req, res) => {
  try {
    await asegurarValesMensuales();
    const fechaInicio = process.env.FECHA_INICIO || '2026-02-18';
    const usuario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const [cartas, recuerdos, valesMensuales, valesCanjeados] = await Promise.all([
      Carta.find(),
      Recuerdo.find(),
      Vale.find({ tipo: 'mensual', periodo, usuario, estado: { $ne: 'canjeado' } }),
      Vale.countDocuments({ estado: 'canjeado', usuario }),
    ]);
    res.json({
      fechaInicio,
      periodo,
      metricas: {
        diasJuntos: diasDesde(fechaInicio),
        cartasEscritas: cartas.length,
        citas: recuerdos.filter(esCita).length,
        valesCanjeados,
      },
      serie: serieMensual(cartas, recuerdos),
      valesMensuales,
      recuerdosRecientes: recuerdos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
        .map(r => {
          const obj = r.toObject();
          if (obj.imagenEnBD) obj.imagen = `/api/imagen/recuerdo/${obj._id}`;
          return obj;
        }),
    });
  } catch (error) {
    console.error('[CORE OS] Error GET /api/dashboard:', error);
    res.status(500).json({ error: 'No se pudo cargar el panel.' });
  }
});

// ── Vales mensuales ────────────────────────────────────────────────────────

app.get('/api/vales', async (req, res) => {
  try {
    await asegurarValesMensuales();
    const usuario = req.headers['x-usuario'] || 'enrique';
    const vales = await Vale.find({ usuario }).sort({ tipo: 1, createdAt: -1 });
    res.json({ vales });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los vales.' });
  }
});

app.post('/api/vales/canjear', async (req, res) => {
  try {
    const { valeId, fecha, notas } = req.body;
    if (!valeId) return res.status(400).json({ error: 'Falta el identificador del vale.' });
    const usuario = req.headers['x-usuario'] || 'enrique';
    const vale = await Vale.findById(valeId);
    if (!vale) return res.status(404).json({ error: 'Vale no encontrado.' });
    if (vale.usuario !== usuario) return res.status(403).json({ error: 'No puedes canjear el vale de otro.' });
    if (vale.estado !== 'disponible') return res.status(400).json({ error: `Estado: ${vale.estado}.` });
    vale.estado = 'canjeado';
    vale.detalles_canje = { fecha: fecha ? new Date(fecha) : new Date(), notas: notas || '' };
    await vale.save();
    const fechaTexto = vale.detalles_canje.fecha.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
    const nombreUsuario = usuario === 'karol' ? 'Karol' : 'Enrique';
    const otro = otroUsuario(usuario);
    await notificar(usuario, `✅ Canjeaste el vale "${vale.titulo}". Fecha: ${fechaTexto}.`);
    await notificar(otro, `🎟️ ${nombreUsuario} canjeó el vale "${vale.titulo}". Fecha: ${fechaTexto}.`);
    res.json({ ok: true, vale });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo canjear el vale.' });
  }
});

// ── Pool de vales mensuales (compartida) ───────────────────────────────────

app.get('/api/vale-pool', async (_req, res) => {
  try { res.json(await ValePool.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: 'No se pudo cargar el pool.' }); }
});

app.post('/api/vale-pool', async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    res.status(201).json(await ValePool.create({ titulo, descripcion: descripcion || '' }));
  } catch { res.status(500).json({ error: 'No se pudo crear.' }); }
});

app.put('/api/vale-pool/:id', async (req, res) => {
  try {
    const doc = await ValePool.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'No encontrado.' });
    res.json(doc);
  } catch { res.status(500).json({ error: 'No se pudo actualizar.' }); }
});

app.delete('/api/vale-pool/:id', async (req, res) => {
  try { await ValePool.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
});

// ── Pool de vales especiales (por autor — secreto para el otro) ────────────

app.get('/api/vale-especial-pool', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    res.json(await ValeEspecialPool.find({ autor }).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ error: 'Error cargando pool especial.' }); }
});

app.post('/api/vale-especial-pool', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const { titulo, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    res.status(201).json(await ValeEspecialPool.create({ titulo, descripcion: descripcion || '', autor }));
  } catch { res.status(500).json({ error: 'No se pudo crear.' }); }
});

app.put('/api/vale-especial-pool/:id', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const doc = await ValeEspecialPool.findOne({ _id: req.params.id, autor });
    if (!doc) return res.status(404).json({ error: 'No encontrado.' });
    const { titulo, descripcion } = req.body;
    if (titulo) doc.titulo = titulo;
    if (descripcion !== undefined) doc.descripcion = descripcion;
    await doc.save();
    res.json(doc);
  } catch { res.status(500).json({ error: 'No se pudo actualizar.' }); }
});

app.delete('/api/vale-especial-pool/:id', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    await ValeEspecialPool.findOneAndDelete({ _id: req.params.id, autor });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
});

// ── Preguntas del mes (las que yo escribo para que el otro responda) ────────

// Mis preguntas — solo las del usuario activo como autor (para ver en admin)
app.get('/api/preguntas-mes', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const preguntas = await PreguntaMensual.find({ autor, periodo: periodoActual() }).sort({ orden: 1 });
    res.json(preguntas);
  } catch { res.status(500).json({ error: 'Error cargando preguntas.' }); }
});

app.post('/api/preguntas-mes', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const dia = diaActual();
    if (dia > 12) return res.status(400).json({ error: 'El período de carga cerró el día 12.' });
    const total = await PreguntaMensual.countDocuments({ autor, periodo });
    if (total >= 6) return res.status(400).json({ error: 'Ya cargaste las 6 preguntas del mes.' });
    const { pregunta, respuesta } = req.body;
    if (!pregunta || !respuesta) return res.status(400).json({ error: 'Faltan pregunta y respuesta.' });
    const doc = await PreguntaMensual.create({ pregunta, respuesta: normalizar(respuesta), autor, periodo, orden: total + 1 });
    res.status(201).json(doc);
  } catch { res.status(500).json({ error: 'No se pudo crear la pregunta.' }); }
});

app.delete('/api/preguntas-mes/:id', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const dia = diaActual();
    if (dia > 12) return res.status(400).json({ error: 'Ya no se pueden borrar preguntas (día 12 pasó).' });
    await PreguntaMensual.findOneAndDelete({ _id: req.params.id, autor, periodo: periodoActual() });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar.' }); }
});

// Pregunta activa para responder (del otro usuario)
app.get('/api/preguntas-mes/activa', async (req, res) => {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const autor = otroUsuario(destinatario);
    const periodo = periodoActual();
    const dia = diaActual();

    // Verificar/actualizar estado del vale especial
    const vem = await verificarEstadoEspecial(periodo, destinatario);

    if (dia < 13) {
      const totalAutor = await PreguntaMensual.countDocuments({ autor, periodo });
      return res.json({
        estado: 'carga',
        mensaje: `Las preguntas abren el día 13. ${autor} lleva ${totalAutor}/6 cargadas.`,
      });
    }

    if (vem?.estado === 'compensacion') {
      return res.json({ estado: 'compensacion', mensaje: `${autor} no cargó preguntas. Vale especial desbloqueado como compensación.`, penalizacion: 'grave' });
    }
    if (vem?.estado === 'inutilizado') {
      return res.json({ estado: 'inutilizado', mensaje: 'El plazo venció el día 18 sin completar todas las preguntas.', penalizacion: vem.penalizacion });
    }
    if (vem?.estado === 'desbloqueado' || vem?.estado === 'canjeado') {
      return res.json({ estado: vem.estado, mensaje: 'Protocolo completado. Vale especial desbloqueado.' });
    }

    // Buscar siguiente pregunta no respondida
    const preguntas = await PreguntaMensual.find({ autor, periodo, respondida: false }).sort({ orden: 1 });
    if (!preguntas.length) {
      return res.json({ estado: 'sin_preguntas', mensaje: `${autor} aún no ha cargado preguntas para este mes.` });
    }

    const siguiente = preguntas[0];
    return res.json({
      estado: 'activa',
      id: siguiente._id,
      orden: siguiente.orden,
      totalPreguntas: await PreguntaMensual.countDocuments({ autor, periodo }),
      respondidas: await PreguntaMensual.countDocuments({ autor, periodo, respondida: true }),
      pregunta: siguiente.pregunta,
      dia,
    });
  } catch (error) {
    console.error('[CORE OS] Error preguntas-mes/activa:', error);
    res.status(500).json({ error: 'Error consultando preguntas.' });
  }
});

// Responder pregunta activa
app.post('/api/preguntas-mes/responder', async (req, res) => {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const autor = otroUsuario(destinatario);
    const periodo = periodoActual();
    const dia = diaActual();

    if (dia < 13) return res.status(400).json({ ok: false, mensaje: 'Aún no es el período de respuesta (día 13).' });
    if (dia > 18) return res.status(400).json({ ok: false, mensaje: 'El plazo de respuesta venció el día 18.' });

    const siguiente = await PreguntaMensual.findOne({ autor, periodo, respondida: false }).sort({ orden: 1 });
    if (!siguiente) return res.json({ ok: false, mensaje: 'No hay pregunta activa.' });

    const { respuesta } = req.body;
    if (normalizar(respuesta) !== normalizar(siguiente.respuesta)) {
      return res.json({ ok: false, incorrecto: true, mensaje: 'Respuesta incorrecta. Inténtalo de nuevo.' });
    }

    siguiente.respondida = true;
    siguiente.fechaRespuesta = new Date();
    await siguiente.save();

    // ¿Todas respondidas?
    const pendientes = await PreguntaMensual.countDocuments({ autor, periodo, respondida: false });
    const totalPreguntas = await PreguntaMensual.countDocuments({ autor, periodo });

    if (pendientes === 0 && totalPreguntas >= 6) {
      // Desbloquear vale especial
      let vem = await ValeEspecialMes.findOne({ periodo, destinatario });
      if (!vem || vem.estado === 'pendiente') {
        const vale = await seleccionarValeEspecial(autor, periodo);
        const fechaVenc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (vem) {
          vem.valeEspecialPoolId = vale?._id || null;
          vem.titulo = vale?.titulo || '';
          vem.descripcion = vale?.descripcion || '';
          vem.estado = 'desbloqueado';
          vem.fechaDesbloqueo = new Date();
          vem.fechaVencimiento = fechaVenc;
          await vem.save();
        } else {
          vem = await ValeEspecialMes.create({
            periodo, destinatario, autor,
            valeEspecialPoolId: vale?._id || null,
            titulo: vale?.titulo || '',
            descripcion: vale?.descripcion || '',
            estado: 'desbloqueado',
            fechaDesbloqueo: new Date(),
            fechaVencimiento: fechaVenc,
          });
        }
        return res.json({ ok: true, completado: true, mensaje: `¡Protocolo completado! Vale especial desbloqueado: ${vem.titulo}`, vem });
      }
    }

    const respondidas = totalPreguntas - pendientes;
    return res.json({
      ok: true,
      completado: false,
      mensaje: `${respondidas}/${totalPreguntas} preguntas respondidas.`,
      pendientes,
    });
  } catch (error) {
    console.error('[CORE OS] Error responder pregunta:', error);
    res.status(500).json({ ok: false, mensaje: 'Error interno.' });
  }
});

// ── Vale especial del mes ──────────────────────────────────────────────────

app.get('/api/vale-especial-mes', async (req, res) => {
  try {
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const vem = await verificarEstadoEspecial(periodo, destinatario);
    if (!vem) {
      const dia = diaActual();
      return res.json({
        estado: dia < 13 ? 'carga' : 'pendiente',
        mensaje: dia < 13 ? 'Período de carga (días 1-12). Respuesta abre el día 13.' : 'En espera de completar las preguntas.',
      });
    }
    res.json(vem);
  } catch { res.status(500).json({ error: 'Error consultando vale especial.' }); }
});

app.post('/api/vale-especial-mes/canjear', async (req, res) => {
  try {
    const { fecha } = req.body;
    const destinatario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const vem = await ValeEspecialMes.findOne({ periodo, destinatario });
    if (!vem) return res.status(404).json({ error: 'Sin vale especial este mes.' });
    if (!['desbloqueado', 'compensacion'].includes(vem.estado)) {
      return res.status(400).json({ error: `Estado del vale: ${vem.estado}.` });
    }
    vem.estado = 'canjeado';
    vem.fechaCanje = fecha ? new Date(fecha) : new Date();
    await vem.save();
    const nombreDest = destinatario === 'karol' ? 'Karol' : 'Enrique';
    const fechaTexto = vem.fechaCanje.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const autor = vem.autor;
    await notificar(destinatario, `✅ Canjeaste tu vale especial "${vem.titulo}". ¡Disfrútalo! Fecha: ${fechaTexto}.`);
    await notificar(autor, `🎁 ${nombreDest} canjeó su vale especial "${vem.titulo}". Fecha: ${fechaTexto}.`);
    res.json({ ok: true, vem });
  } catch { res.status(500).json({ error: 'No se pudo canjear.' }); }
});

// ── Usuarios ───────────────────────────────────────────────────────────────

app.get('/api/usuarios', async (_req, res) => {
  try { res.json(await Usuario.find()); }
  catch { res.status(500).json({ error: 'Error.' }); }
});

// ── Cartas ─────────────────────────────────────────────────────────────────

app.get('/api/cartas', async (_req, res) => {
  try {
    const cartas = await Carta.find().sort({ createdAt: -1 });
    res.json(cartas.map((c) => {
      const obj = c.toObject();
      if (c.imagenEnBD) obj.imagen = `/api/imagen/carta/${c._id}`;
      return obj;
    }));
  } catch (error) {
    console.error('[CORE OS] Error GET /api/cartas:', error);
    res.status(500).json({ error: 'No se pudieron cargar las cartas.' });
  }
});

app.get('/api/imagen/carta/:id', async (req, res) => {
  try {
    const carta = await Carta.findById(req.params.id).select('+imagenData');
    if (!carta?.imagenData) return res.status(404).end();
    res.set('Content-Type', carta.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(carta.imagenData);
  } catch { res.status(404).end(); }
});

app.post('/api/cartas', upload.single('archivo'), comprimirArchivo, async (req, res) => {
  try {
    const { titulo, cuerpo, autor, fecha, para } = req.body;
    if (!titulo || !autor) return res.status(400).json({ error: 'Faltan título o autor.' });
    const doc = { titulo, cuerpo: cuerpo || '', autor, para: para || '', fecha: fecha ? new Date(fecha) : null };
    if (req.file?.buffer) { doc.imagenData = req.file.buffer; doc.imagenMime = req.file.mimetype; doc.imagenEnBD = true; }
    const carta = await Carta.create(doc);
    if (carta.imagenEnBD) carta.imagen = `/api/imagen/carta/${carta._id}`;
    res.status(201).json(carta);
  } catch (error) {
    console.error('[CORE OS] Error POST /api/cartas:', error);
    res.status(500).json({ error: 'No se pudo guardar la carta.' });
  }
});

// ── Recuerdos ──────────────────────────────────────────────────────────────

app.get('/api/recuerdos', async (_req, res) => {
  try {
    const recuerdos = await Recuerdo.find().sort({ fecha: -1 });
    res.json(recuerdos.map((r) => {
      const obj = r.toObject();
      if (r.imagenEnBD) obj.imagen = `/api/imagen/recuerdo/${r._id}`;
      return obj;
    }));
  } catch (error) {
    console.error('[CORE OS] Error GET /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los recuerdos.' });
  }
});

app.get('/api/imagen/recuerdo/:id', async (req, res) => {
  try {
    const recuerdo = await Recuerdo.findById(req.params.id).select('+imagenData');
    if (!recuerdo?.imagenData) return res.status(404).end();
    res.set('Content-Type', recuerdo.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(recuerdo.imagenData);
  } catch { res.status(404).end(); }
});

app.post('/api/recuerdos', upload.single('archivo'), comprimirArchivo, async (req, res) => {
  try {
    const { titulo, nota, tipo, fecha } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    const doc = { titulo, nota: nota || '', tipo: tipo || 'recuerdo', fecha: fecha ? new Date(fecha) : new Date() };
    if (req.file?.buffer) { doc.imagenData = req.file.buffer; doc.imagenMime = req.file.mimetype; doc.imagenEnBD = true; }
    const recuerdo = await Recuerdo.create(doc);
    if (recuerdo.imagenEnBD) recuerdo.imagen = `/api/imagen/recuerdo/${recuerdo._id}`;
    res.status(201).json(recuerdo);
  } catch (error) {
    console.error('[CORE OS] Error POST /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo guardar el recuerdo.' });
  }
});

app.put('/api/recuerdos/:id', async (req, res) => {
  try {
    const { titulo, nota, tipo, fecha } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    const updates = { titulo, nota: nota || '', tipo: tipo || 'recuerdo' };
    if (fecha) updates.fecha = new Date(fecha);
    const recuerdo = await Recuerdo.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!recuerdo) return res.status(404).json({ error: 'Recuerdo no encontrado.' });
    res.json(recuerdo);
  } catch (error) {
    console.error('[CORE OS] Error PUT /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo actualizar el recuerdo.' });
  }
});

app.delete('/api/recuerdos/:id', async (req, res) => {
  try { await Recuerdo.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (error) {
    console.error('[CORE OS] Error DELETE /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo borrar el recuerdo.' });
  }
});

// ── Calendario ────────────────────────────────────────────────────────────

function diaClave(fecha) {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function agregarEvento(mapa, fecha, evento) {
  if (!fecha) return;
  const k = diaClave(fecha);
  if (!mapa[k]) mapa[k] = [];
  mapa[k].push(evento);
}

app.get('/api/calendario', async (req, res) => {
  try {
    const { mes } = req.query; // 'YYYY-MM'
    const usuario = req.headers['x-usuario'] || 'enrique';
    const otro = otroUsuario(usuario);

    const [year, month] = (mes || periodoActual()).split('-').map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    const [valesCanjeados, valesEspecialesCanjeados, recuerdos, cartas, citasPropuestas] = await Promise.all([
      Vale.find({ estado: 'canjeado', usuario, 'detalles_canje.fecha': { $gte: inicio, $lt: fin } }).lean(),
      ValeEspecialMes.find({ estado: 'canjeado', destinatario: usuario, fechaCanje: { $gte: inicio, $lt: fin } }).lean(),
      Recuerdo.find({ fecha: { $gte: inicio, $lt: fin } }).lean(),
      Carta.find({ $or: [{ fecha: { $gte: inicio, $lt: fin } }, { createdAt: { $gte: inicio, $lt: fin } }] }).lean(),
      CitaPropuesta.find({
        $or: [{ proponente: usuario }, { destinatario: usuario }, { proponente: otro }, { destinatario: otro }],
        estado: { $in: ['pendiente', 'aceptada'] },
        fechaPropuesta: { $gte: inicio, $lt: fin },
      }).lean(),
    ]);

    const eventos = {};

    for (const v of valesCanjeados) {
      agregarEvento(eventos, v.detalles_canje?.fecha, { tipo: 'vale_canjeado', titulo: v.titulo, id: v._id });
    }
    for (const ve of valesEspecialesCanjeados) {
      agregarEvento(eventos, ve.fechaCanje, { tipo: 'vale_canjeado', titulo: ve.titulo || 'Vale especial', id: ve._id });
    }
    for (const r of recuerdos) {
      const tipo = (r.tipo === 'cita' || r.tipo === 'cafe') ? 'cita_registrada' : 'recuerdo';
      agregarEvento(eventos, r.fecha, { tipo, titulo: r.titulo, id: r._id });
    }
    for (const c of cartas) {
      agregarEvento(eventos, c.fecha || c.createdAt, { tipo: 'carta', titulo: c.titulo, autor: c.autor, id: c._id });
    }
    for (const cp of citasPropuestas) {
      const tipo = cp.estado === 'aceptada' ? 'cita_confirmada' : 'cita_pendiente';
      agregarEvento(eventos, cp.fechaPropuesta, { tipo, titulo: cp.titulo, id: cp._id, proponente: cp.proponente, destinatario: cp.destinatario, estado: cp.estado });
    }

    res.json(eventos);
  } catch (error) {
    console.error('[CORE OS] Error GET /api/calendario:', error);
    res.status(500).json({ error: 'No se pudo cargar el calendario.' });
  }
});

// ── Citas propuestas ───────────────────────────────────────────────────────

// Citas pendientes que me enviaron a mí
app.get('/api/citas-propuestas/pendientes', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const citas = await CitaPropuesta.find({ destinatario: usuario, estado: 'pendiente' }).sort({ fechaPropuesta: 1 });
    res.json(citas);
  } catch { res.status(500).json({ error: 'Error cargando citas pendientes.' }); }
});

// Todas las citas que involucran al usuario (para la sidebar)
app.get('/api/citas-propuestas', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const citas = await CitaPropuesta.find({
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: { $in: ['pendiente', 'aceptada'] },
    }).sort({ fechaPropuesta: 1 });
    res.json(citas);
  } catch { res.status(500).json({ error: 'Error cargando citas.' }); }
});

// Proponer nueva cita
app.post('/api/citas-propuestas', async (req, res) => {
  try {
    const proponente = req.headers['x-usuario'] || 'enrique';
    const { titulo, nota, fechaPropuesta } = req.body;
    if (!titulo || !fechaPropuesta) return res.status(400).json({ error: 'Faltan título y fecha.' });
    const destinatario = otroUsuario(proponente);
    const cita = await CitaPropuesta.create({
      proponente,
      destinatario,
      titulo,
      nota: nota || '',
      fechaPropuesta: new Date(fechaPropuesta),
    });
    const nombreProp = proponente === 'karol' ? 'Karol' : 'Enrique';
    const fechaCitaTexto = new Date(fechaPropuesta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await notificar(destinatario, `📅 ${nombreProp} te propuso una cita: "${titulo}" para el ${fechaCitaTexto}. Entra a CORE OS para aceptar o rechazar.`);
    res.status(201).json(cita);
  } catch { res.status(500).json({ error: 'No se pudo crear la cita.' }); }
});

// Aceptar cita (solo el destinatario)
app.put('/api/citas-propuestas/:id/aceptar', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({ _id: req.params.id, destinatario: usuario, estado: 'pendiente' });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada o no puedes aceptarla.' });

    // Crear Recuerdo inmediatamente al aceptar
    const recuerdo = await Recuerdo.create({
      titulo: cita.titulo,
      nota: cita.nota || '',
      tipo: 'cita',
      fecha: cita.fechaPropuesta,
    });

    cita.estado = 'aceptada';
    cita.fechaRespuesta = new Date();
    cita.recuerdoId = recuerdo._id;
    await cita.save();

    const nombreDest = usuario === 'karol' ? 'Karol' : 'Enrique';
    await notificar(cita.proponente, `✅ ${nombreDest} aceptó tu cita "${cita.titulo}". ¡Ya está en Recuerdos!`);
    res.json(cita);
  } catch { res.status(500).json({ error: 'No se pudo aceptar.' }); }
});

// Rechazar cita (solo el destinatario) → se elimina
app.delete('/api/citas-propuestas/:id/rechazar', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({ _id: req.params.id, destinatario: usuario, estado: 'pendiente' });
    if (!cita) return res.status(404).json({ error: 'No encontrada o ya no es pendiente.' });
    const nombreDest = usuario === 'karol' ? 'Karol' : 'Enrique';
    await notificar(cita.proponente, `❌ ${nombreDest} no pudo aceptar la cita "${cita.titulo}". Puedes proponer otra fecha.`);
    await cita.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo rechazar.' }); }
});

// Reagendar cita aceptada (cualquiera de los dos)
app.put('/api/citas-propuestas/:id/reagendar', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ error: 'Falta la nueva fecha.' });
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: 'aceptada',
    });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada o no está aceptada.' });
    cita.fechaPropuesta = new Date(fecha);
    await cita.save();
    if (cita.recuerdoId) {
      await Recuerdo.findByIdAndUpdate(cita.recuerdoId, { fecha: new Date(fecha) });
    }
    const nombreUsuario = usuario === 'karol' ? 'Karol' : 'Enrique';
    const otro = otroUsuario(usuario);
    const fechaTexto = new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await notificar(otro, `📅 ${nombreUsuario} reagendó la cita "${cita.titulo}" para el ${fechaTexto}.`);
    res.json({ ok: true, cita });
  } catch { res.status(500).json({ error: 'No se pudo reagendar.' }); }
});

// Cancelar cita (cualquiera de los dos, en cualquier estado activo)
app.delete('/api/citas-propuestas/:id/cancelar', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: { $in: ['pendiente', 'aceptada'] },
    });
    if (!cita) return res.status(404).json({ error: 'No encontrada.' });
    await cita.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo cancelar.' }); }
});

// Completar cita → marca como completada (el Recuerdo ya fue creado al aceptar)
app.put('/api/citas-propuestas/:id/completar', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const cita = await CitaPropuesta.findOne({
      _id: req.params.id,
      $or: [{ proponente: usuario }, { destinatario: usuario }],
      estado: 'aceptada',
    });
    if (!cita) return res.status(404).json({ error: 'No encontrada o no está aceptada.' });
    cita.estado = 'completada';
    await cita.save();
    res.json({ ok: true, cita });
  } catch { res.status(500).json({ error: 'No se pudo completar.' }); }
});

// ── Mensajes diarios ───────────────────────────────────────────────────────

app.get('/api/mensajes', async (req, res) => {
  try {
    const ahora = new Date();
    const mensajes = await Mensaje.find({ expiraEn: { $gt: ahora } }).sort({ createdAt: 1 });
    const resultado = mensajes.map(m => {
      const obj = m.toObject();
      if (obj.imagenEnBD) obj.imagen = `/api/imagen/mensaje/${obj._id}`;
      return obj;
    });
    res.json(resultado);
  } catch { res.status(500).json({ error: 'No se pudieron cargar los mensajes.' }); }
});

app.get('/api/imagen/mensaje/:id', async (req, res) => {
  try {
    const m = await Mensaje.findById(req.params.id).select('+imagenData');
    if (!m?.imagenData) return res.status(404).end();
    res.set('Content-Type', m.imagenMime || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=86400');
    res.send(m.imagenData);
  } catch { res.status(500).end(); }
});

app.post('/api/mensajes', upload.single('archivo'), comprimirArchivo, async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const { contenido } = req.body;
    if (!contenido?.trim() && !req.file) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }
    const doc = {
      autor,
      contenido: String(contenido || '').slice(0, 2000),
      expiraEn: proximaMedianoche(),
    };
    if (req.file?.buffer) {
      doc.imagenData = req.file.buffer;
      doc.imagenMime = req.file.mimetype;
      doc.imagenEnBD = true;
    }
    const mensaje = await Mensaje.create(doc);
    if (mensaje.imagenEnBD) mensaje.imagen = `/api/imagen/mensaje/${mensaje._id}`;
    // Notificar al otro solo con el primer mensaje del día
    const destinatario = otroUsuario(autor);
    notificarPrimerMensaje(destinatario, autor).catch(() => {});
    res.status(201).json(mensaje);
  } catch (err) {
    console.error('[CORE OS] Error POST /api/mensajes:', err);
    res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
  }
});

app.delete('/api/mensajes/:id', async (req, res) => {
  try {
    const autor = req.headers['x-usuario'] || 'enrique';
    const mensaje = await Mensaje.findById(req.params.id);
    if (!mensaje) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    if (mensaje.autor !== autor) return res.status(403).json({ error: 'Solo puedes borrar tus propios mensajes.' });
    await mensaje.deleteOne();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'No se pudo borrar el mensaje.' }); }
});

// ── Start ──────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();
  await asegurarValesMensuales();
  app.listen(PORT, () => console.log(`[CORE OS] API escuchando en http://localhost:${PORT}`));
}

start().catch((error) => { console.error('[CORE OS] Fallo al iniciar:', error); process.exit(1); });
