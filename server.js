// ============================================================
//  REWA KRIPA TRAVELS — Backend Server
//  src/server.js
// ============================================================

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./routes/auth');
const seatsRoutes      = require('./routes/seats');
const configRoutes     = require('./routes/config');
const busesRoutes      = require('./routes/buses');
const routesRoutes     = require('./routes/routes');
const tripsRoutes      = require('./routes/trips');
const staffRoutes      = require('./routes/staff');
const attendanceRoutes = require('./routes/attendance');
const financeRoutes    = require('./routes/finance');

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow curl / Postman (no origin) in dev
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev only) ─────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    service: 'rewa-kripa-backend',
    time   : new Date().toISOString(),
    env    : process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/seats',      seatsRoutes);
app.use('/api/config',     configRoutes);
app.use('/api/buses',      busesRoutes);
app.use('/api/routes',     routesRoutes);
app.use('/api/trips',      tripsRoutes);
app.use('/api/staff',      staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance',    financeRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚌  Rewa Kripa Backend running on http://localhost:${PORT}`);
  console.log(`📋  Health: http://localhost:${PORT}/health`);
  console.log(`🌍  Env   : ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
