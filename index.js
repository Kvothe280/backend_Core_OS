require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const { connectDB } = require('./db');
const { upload, comprimirArchivo } = require('./upload');
const { asegurarValesMensuales, periodoActual } = require('./monthly');
const Vale = require('./models/Vale');
const Enigma = require('./models/Enigma');
const Carta = require('./models/Carta');
const Recuerdo = require('./models/Recuerdo');
const ValeCifradoMes = require('./models/ValeCifradoMes');
const PreguntaCifrada = require('./models/PreguntaCifrada');
const { recompensaAleatoria } = require('./config/valeCifrado');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Autenticación de 2 usuarios ───────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { clave } = req.body;
  const passKarol = process.env.PASS_KAROL;
  const passEnrique = process.env.PASS_ENRIQUE;
  if (!passKarol && !passEnrique) return res.json({ ok: true, usuario: 'enrique' });
  if (passKarol && normalizar(clave) === normalizar(passKarol)) return res.json({ ok: true, usuario: 'karol' });
  if (passEnrique && normalizar(clave) === normalizar(passEnrique)) return res.json({ ok: true, usuario: 'enrique' });
  res.status(401).json({ ok: false });
});

const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

discordClient.once('ready', () => {
  console.log(`[CORE OS] Bot Discord en línea como ${discordClient.user.tag}`);
});

function normalizar(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function diasDesde(fechaIso) {
  const inicio = new Date(`${fechaIso}T00:00:00`);
  const ahora = new Date();
  const ms = ahora.getTime() - inicio.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

async function estadoBoveda(periodo, usuario) {
  const p = periodo || periodoActual();
  const filtro = { periodo: p, ...(usuario ? { usuario } : {}) };
  const [pendientes, total] = await Promise.all([
    Enigma.countDocuments({ ...filtro, resuelto: false }),
    Enigma.countDocuments(filtro),
  ]);
  return {
    bovedaAbierta: total >= 6 && pendientes === 0,
    enigmasResueltos: Math.max(0, total - pendientes),
    enigmasTotal: total,
  };
}

function esCita(r) {
  return r.tipo === 'cita' || r.tipo === 'cafe';
}

function serieMensual(cartas, recuerdos) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ahora = new Date();
  const puntos = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const cartasMes = cartas.filter((c) => {
      const f = new Date(c.createdAt);
      return f.getFullYear() === y && f.getMonth() === m;
    }).length;
    const citasMes = recuerdos.filter((r) => {
      const f = new Date(r.fecha || r.createdAt);
      return esCita(r) && f.getFullYear() === y && f.getMonth() === m;
    }).length;
    puntos.push({ mes: meses[m], cartas: cartasMes, citas: citasMes });
  }
  return puntos;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

app.get('/api/dashboard', async (req, res) => {
  try {
    await asegurarValesMensuales();
    const fechaInicio = process.env.FECHA_INICIO || '2026-02-18';
    const usuario = req.headers['x-usuario'];
    const estado = await estadoBoveda(null, usuario);
    const [cartas, recuerdos, valesMensuales, valesCanjeados] = await Promise.all([
      Carta.find(),
      Recuerdo.find(),
      Vale.find({ tipo: 'mensual', periodo: periodoActual(), usuario, estado: { $ne: 'canjeado' } }),
      Vale.countDocuments({ estado: 'canjeado', usuario }),
    ]);

    res.json({
      ...estado,
      fechaInicio,
      periodo: periodoActual(),
      metricas: {
        diasJuntos: diasDesde(fechaInicio),
        cartasEscritas: cartas.length,
        citas: recuerdos.filter(esCita).length,
        valesCanjeados,
        mesesCumplidos: 6,
      },
      serie: serieMensual(cartas, recuerdos),
      valesMensuales,
      recuerdosRecientes: recuerdos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 6),
    });
  } catch (error) {
    console.error('[CORE OS] Error GET /api/dashboard:', error);
    res.status(500).json({ error: 'No se pudo cargar el panel.' });
  }
});

// ── Vales ──────────────────────────────────────────────────────────────────

app.get('/api/vales', async (req, res) => {
  try {
    await asegurarValesMensuales();
    const usuario = req.headers['x-usuario'] || 'enrique';
    const estado = await estadoBoveda(null, usuario);
    const vales = await Vale.find({ usuario }).sort({ tipo: 1, mes: 1, createdAt: -1 });

    if (!estado.bovedaAbierta) {
      return res.json({
        ...estado,
        vales: vales.map((vale) => {
          if (vale.tipo === 'mensual') return vale;
          return {
            _id: vale._id,
            mes: vale.mes,
            tipo: vale.tipo,
            estado: 'bloqueado',
            titulo: '[ARCHIVO ENCRIPTADO]',
            descripcion: 'Requiere desencriptación desde Terminal.',
            imagen: null,
          };
        }),
      });
    }

    res.json({ ...estado, vales });
  } catch (error) {
    console.error('[CORE OS] Error GET /api/vales:', error);
    res.status(500).json({ error: 'No se pudieron obtener los vales.' });
  }
});

app.post('/api/vales/canjear', async (req, res) => {
  try {
    const { valeId, fecha, notas } = req.body;
    if (!valeId) {
      return res.status(400).json({ error: 'Falta el identificador del vale.' });
    }

    const vale = await Vale.findById(valeId);
    if (!vale) {
      return res.status(404).json({ error: 'Vale no encontrado.' });
    }

    if (vale.tipo !== 'mensual') {
      const estado = await estadoBoveda();
      if (!estado.bovedaAbierta) {
        return res.status(403).json({ error: 'La Bóveda sigue cifrada.' });
      }
    }

    if (vale.estado !== 'disponible') {
      return res.status(400).json({
        error: `El vale no está disponible (estado: ${vale.estado}).`,
      });
    }

    vale.estado = 'canjeado';
    vale.detalles_canje = {
      fecha: fecha ? new Date(fecha) : new Date(),
      notas: notas || '',
    };
    await vale.save();

    const fechaTexto = vale.detalles_canje.fecha
      ? vale.detalles_canje.fecha.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
      : 'Sin fecha';

    const embed = new EmbedBuilder()
      .setColor(0x6f4e37)
      .setTitle('¡Misión Aceptada!')
      .setDescription(`Karol acaba de canjear el vale **${vale.titulo}**.`)
      .addFields(
        { name: 'Fecha solicitada', value: fechaTexto, inline: true },
        { name: 'Notas', value: vale.detalles_canje.notas || '—', inline: false }
      )
      .setTimestamp(new Date());

    try {
      const userEnrique = await discordClient.users.fetch(process.env.DISCORD_TU_ID);
      await userEnrique.send({ embeds: [embed] });
      const userKarol = await discordClient.users.fetch(process.env.DISCORD_ELLA_ID);
      await userKarol.send(`Confirmación: tu vale **${vale.titulo}** quedó registrado. Fecha: ${fechaTexto}.`);
    } catch (discordError) {
      console.error('[CORE OS] Error enviando DMs de Discord:', discordError.message);
    }

    res.json({ ok: true, vale });
  } catch (error) {
    console.error('[CORE OS] Error POST /api/vales/canjear:', error);
    res.status(500).json({ error: 'No se pudo canjear el vale.' });
  }
});

// ── Vale Cifrado del Mes ───────────────────────────────────────────────────

app.get('/api/vale-cifrado', async (req, res) => {
  try {
    const periodo = periodoActual();
    const usuario = req.headers['x-usuario'] || 'enrique';
    let registro = await ValeCifradoMes.findOne({ periodo, usuario });
    if (!registro) registro = await ValeCifradoMes.create({ periodo, usuario });
    // Solo preguntas no usadas — pool fresco sin repeticiones
    const preguntas = await PreguntaCifrada.find({ usada: false }).sort({ orden: 1 });
    res.json({
      periodo,
      usuario,
      desbloqueado: registro.desbloqueado,
      recompensa: registro.desbloqueado ? registro.recompensa : '',
      intentosFallidos: registro.intentosFallidos,
      preguntas: preguntas.map((p) => ({ id: String(p._id), pregunta: p.pregunta })),
    });
  } catch (error) {
    console.error('[CORE OS] Error GET /api/vale-cifrado:', error);
    res.status(500).json({ error: 'No se pudo cargar el vale cifrado.' });
  }
});

app.post('/api/vale-cifrado/intentar', async (req, res) => {
  try {
    const { respuestas } = req.body;
    if (!respuestas || typeof respuestas !== 'object') {
      return res.status(400).json({ error: 'Faltan las respuestas.' });
    }
    const periodo = periodoActual();
    const usuario = req.headers['x-usuario'] || 'enrique';
    let registro = await ValeCifradoMes.findOne({ periodo, usuario });
    if (!registro) registro = await ValeCifradoMes.create({ periodo, usuario });
    if (registro.desbloqueado) {
      return res.json({ ok: true, yaDesbloqueado: true, recompensa: registro.recompensa });
    }
    // Solo preguntas no usadas
    const preguntas = await PreguntaCifrada.find({ usada: false }).sort({ orden: 1 });
    const incorrectas = [];
    for (const p of preguntas) {
      const enviada = normalizar(respuestas[String(p._id)] || '');
      if (normalizar(p.respuesta) && enviada !== normalizar(p.respuesta)) {
        incorrectas.push(String(p._id));
      }
    }
    if (incorrectas.length > 0) {
      registro.intentosFallidos += 1;
      await registro.save();
      return res.json({ ok: false, incorrectas });
    }
    // Marcar todas las preguntas usadas como vetadas del pool
    await PreguntaCifrada.updateMany(
      { _id: { $in: preguntas.map((p) => p._id) } },
      { $set: { usada: true } }
    );
    const recompensa = recompensaAleatoria();
    registro.desbloqueado = true;
    registro.recompensa = recompensa;
    await registro.save();
    res.json({ ok: true, recompensa });
  } catch (error) {
    console.error('[CORE OS] Error POST /api/vale-cifrado/intentar:', error);
    res.status(500).json({ error: 'Fallo al validar respuestas.' });
  }
});

// ── CRUD Preguntas Vale Cifrado ────────────────────────────────────────────

app.get('/api/preguntas-cifrado', async (_req, res) => {
  try {
    const preguntas = await PreguntaCifrada.find().sort({ orden: 1 });
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron cargar las preguntas.' });
  }
});

app.post('/api/preguntas-cifrado', async (req, res) => {
  try {
    const { pregunta, respuesta, orden } = req.body;
    if (!pregunta || !respuesta) return res.status(400).json({ error: 'Faltan pregunta o respuesta.' });
    const total = await PreguntaCifrada.countDocuments();
    const doc = await PreguntaCifrada.create({ pregunta, respuesta, orden: orden ?? total + 1 });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear la pregunta.' });
  }
});

app.put('/api/preguntas-cifrado/:id', async (req, res) => {
  try {
    const { pregunta, respuesta, orden } = req.body;
    const doc = await PreguntaCifrada.findByIdAndUpdate(
      req.params.id,
      { pregunta, respuesta, orden },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrada.' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar.' });
  }
});

app.delete('/api/preguntas-cifrado/:id', async (req, res) => {
  try {
    await PreguntaCifrada.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo borrar.' });
  }
});

// ── Enigmas ────────────────────────────────────────────────────────────────

// ── Enigmas (mensuales, anti-reuso, bloqueo día 15) ───────────────────────

app.get('/api/enigmas', async (req, res) => {
  try {
    const usuario = req.headers['x-usuario'] || 'enrique';
    const enigmas = await Enigma.find({ periodo: periodoActual(), usuario }).sort({ orden: 1 });
    res.json(enigmas);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron cargar los enigmas.' });
  }
});

app.post('/api/enigmas', async (req, res) => {
  try {
    const { pregunta, respuesta } = req.body;
    if (!pregunta || !respuesta) return res.status(400).json({ error: 'Faltan pregunta y respuesta.' });
    const usuario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const total = await Enigma.countDocuments({ periodo, usuario });
    if (total >= 6) return res.status(400).json({ error: 'Ya hay 6 enigmas para este mes.' });
    const reusado = await Enigma.findOne({ usuario, respuesta: { $regex: new RegExp(`^${normalizar(respuesta)}$`, 'i') }, periodo: { $ne: periodo } });
    if (reusado) return res.status(400).json({ error: 'Esta respuesta ya fue usada en un mes anterior.' });
    const enigma = await Enigma.create({ orden: total + 1, pregunta, respuesta, periodo, usuario, resuelto: false });
    res.status(201).json(enigma);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el enigma.' });
  }
});

app.put('/api/enigmas/:id', async (req, res) => {
  try {
    const { pregunta, respuesta } = req.body;
    const enigma = await Enigma.findById(req.params.id);
    if (!enigma) return res.status(404).json({ error: 'No encontrado.' });
    if (enigma.resuelto) return res.status(400).json({ error: 'No se puede editar un enigma ya resuelto.' });
    if (pregunta) enigma.pregunta = pregunta;
    if (respuesta) enigma.respuesta = respuesta;
    await enigma.save();
    res.json(enigma);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar.' });
  }
});

app.delete('/api/enigmas/:id', async (req, res) => {
  try {
    const enigma = await Enigma.findById(req.params.id);
    if (!enigma) return res.status(404).json({ error: 'No encontrado.' });
    if (enigma.resuelto) return res.status(400).json({ error: 'No se puede borrar un enigma resuelto.' });
    await enigma.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo borrar.' });
  }
});

app.get('/api/enigmas/activo', async (req, res) => {
  try {
    const periodo = periodoActual();
    const dia = new Date().getDate();
    const usuario = req.headers['x-usuario'] || 'enrique';
    const total = await Enigma.countDocuments({ periodo, usuario });

    if (total < 6 && dia >= 15) {
      return res.json({
        activo: false,
        bloqueado: true,
        bovedaAbierta: false,
        enigmasResueltos: 0,
        enigmasTotal: total,
        mensaje: `Terminal bloqueada. No se cargaron los 6 enigmas antes del día 15 (hay ${total}/6).`,
      });
    }

    if (total < 6) {
      return res.json({
        activo: false,
        pendienteConfiguracion: true,
        bovedaAbierta: false,
        enigmasResueltos: 0,
        enigmasTotal: total,
        mensaje: `Faltan ${6 - total} enigmas por cargar para este mes (día límite: 15).`,
      });
    }

    const estado = await estadoBoveda(periodo, usuario);
    const enigma = await Enigma.findOne({ periodo, usuario, resuelto: false }).sort({ orden: 1 });
    if (!enigma) {
      return res.json({ activo: false, ...estado, mensaje: 'Protocolo completo. La Bóveda está abierta.' });
    }
    res.json({
      activo: true,
      ...estado,
      id: enigma._id,
      orden: enigma.orden,
      pregunta: enigma.pregunta || `Enigma ${enigma.orden}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar el enigma.' });
  }
});

app.post('/api/terminal/validar', async (req, res) => {
  try {
    const { respuesta } = req.body;
    if (!respuesta || !String(respuesta).trim()) {
      return res.status(400).json({ ok: false, mensaje: 'Ingresa una respuesta.' });
    }
    const usuario = req.headers['x-usuario'] || 'enrique';
    const periodo = periodoActual();
    const enigma = await Enigma.findOne({ periodo, usuario, resuelto: false }).sort({ orden: 1 });
    if (!enigma) {
      return res.json({ ok: false, desencriptando: false, mensaje: 'No hay enigmas pendientes.', bovedaAbierta: true });
    }
    if (normalizar(respuesta) !== normalizar(enigma.respuesta)) {
      return res.json({ ok: false, desencriptando: false, mensaje: 'ACCESO DENEGADO. La clave no coincide.' });
    }
    enigma.resuelto = true;
    await enigma.save();

    const estado = await estadoBoveda(periodo, usuario);
    if (estado.bovedaAbierta) {
      await Vale.updateMany({ tipo: { $ne: 'mensual' }, estado: 'bloqueado', usuario }, { $set: { estado: 'disponible' } });
    }
    res.json({
      ok: true,
      desencriptando: true,
      mensaje: estado.bovedaAbierta
        ? 'Protocolo 6/6. Bóveda desencriptada.'
        : `Fragmento ${enigma.orden}/6 aceptado. Siguiente capa…`,
      ...estado,
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Fallo interno del sistema.' });
  }
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
  } catch {
    res.status(404).end();
  }
});

app.post('/api/cartas', upload.single('archivo'), comprimirArchivo, async (req, res) => {
  try {
    const { titulo, cuerpo, autor, fecha } = req.body;
    if (!titulo || !autor) {
      return res.status(400).json({ error: 'Faltan título o autor.' });
    }
    const { para } = req.body;
    const doc = { titulo, cuerpo: cuerpo || '', autor, para: para || '', fecha: fecha ? new Date(fecha) : null };
    if (req.file?.buffer) {
      doc.imagenData = req.file.buffer;
      doc.imagenMime = req.file.mimetype;
      doc.imagenEnBD = true;
    }
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
  } catch {
    res.status(404).end();
  }
});

app.post('/api/recuerdos', upload.single('imagen'), comprimirArchivo, async (req, res) => {
  try {
    const { titulo, nota, tipo, fecha } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    const doc = { titulo, nota: nota || '', tipo: tipo || 'recuerdo', fecha: fecha ? new Date(fecha) : new Date() };
    if (req.file?.buffer) {
      doc.imagenData = req.file.buffer;
      doc.imagenMime = req.file.mimetype;
      doc.imagenEnBD = true;
    }
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
  try {
    await Recuerdo.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('[CORE OS] Error DELETE /api/recuerdos:', error);
    res.status(500).json({ error: 'No se pudo borrar el recuerdo.' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();
  // Limpiar enigmas del sistema anterior (sin campo periodo)
  await Enigma.deleteMany({ $or: [{ periodo: '' }, { periodo: { $exists: false } }] });
  await asegurarValesMensuales();
  await discordClient.login(process.env.DISCORD_BOT_TOKEN);
  app.listen(PORT, () => {
    console.log(`[CORE OS] API escuchando en http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('[CORE OS] Fallo al iniciar:', error);
  process.exit(1);
});
