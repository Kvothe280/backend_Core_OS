const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { FRONTEND_URL } = require('./config/env');
const { verificarToken } = require('./middlewares/auth');

const authRoutes = require('./routes/auth.routes');
const imagenesRoutes = require('./routes/imagenes.routes'); // públicas: imagen/*, avatar GET
const dashboardRoutes = require('./routes/dashboard.routes');
const valesRoutes = require('./routes/vales.routes');
const valePoolRoutes = require('./routes/valePool.routes');
const valeEspecialPoolRoutes = require('./routes/valeEspecialPool.routes');
const preguntasMesRoutes = require('./routes/preguntasMes.routes');
const valeEspecialMesRoutes = require('./routes/valeEspecialMes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const cartasRoutes = require('./routes/cartas.routes');
const recuerdosRoutes = require('./routes/recuerdos.routes');
const calendarioRoutes = require('./routes/calendario.routes');
const citasPropuestasRoutes = require('./routes/citasPropuestas.routes');
const mensajesRoutes = require('./routes/mensajes.routes');
const moodRoutes = require('./routes/mood.routes');
const avatarRoutes = require('./routes/avatar.routes'); // protegida: solo POST
const cancionesRoutes = require('./routes/canciones.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const fechasImportantesRoutes = require('./routes/fechasImportantes.routes');

const app = express();

// ── Seguridad — headers HTTP ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Autenticación e imágenes públicas (sin token) ──────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', imagenesRoutes);

// ── Todas las rutas siguientes requieren token ─────────────────────────────
app.use('/api', verificarToken);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vales', valesRoutes);
app.use('/api/vale-pool', valePoolRoutes);
app.use('/api/vale-especial-pool', valeEspecialPoolRoutes);
app.use('/api/preguntas-mes', preguntasMesRoutes);
app.use('/api/vale-especial-mes', valeEspecialMesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cartas', cartasRoutes);
app.use('/api/recuerdos', recuerdosRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/citas-propuestas', citasPropuestasRoutes);
app.use('/api/mensajes', mensajesRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/canciones', cancionesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/fechas-importantes', fechasImportantesRoutes);

module.exports = app;
