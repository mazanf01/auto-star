'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { startScheduler } = require('./services/scheduler');

const app = express();

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
const { router: menusRouter, allMenusRouter } = require('./routes/menus');
app.use('/api/menus', menusRouter);
app.use('/api/admin/menus', allMenusRouter);
app.use('/api/activity', require('./routes/activity'));
app.use('/api/star-asn', require('./routes/star-asn'));
app.use('/api/presensi-settings', require('./routes/presensi-settings'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/admin/settings', require('./routes/admin-settings'));
app.use('/api/admin/star-accounts', require('./routes/admin-star-accounts'));

// ─── 404 ────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// ─── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  STAR ASN Web API                        ║`);
  console.log(`║  Listening on http://localhost:${PORT}      ║`);
  console.log(`║  CORS: ${process.env.CORS_ORIGIN || '*'}`.padEnd(44) + `║`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  // Start auto-presensi scheduler
  startScheduler();
});

module.exports = app;
