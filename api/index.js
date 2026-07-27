'use strict';

/**
 * Vercel Serverless Entry Point — Express API Adapter
 *
 * Vercel mengeksekusi file di /api/ sebagai serverless functions.
 * File ini meng-export Express app (dari backend/server.js) sebagai
 * handler untuk semua /api/* routes.
 *
 * vercel.json routes /api/* → /api/index.js
 */

const app = require('../backend/server.js');

module.exports = app;
