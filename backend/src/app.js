/**
 * Express Application Entry Point
 *
 * This file does three things:
 * 1. Creates and configures the Express app (middleware setup)
 * 2. Mounts routes
 * 3. Starts the HTTP server
 *
 * WHY SEPARATE app FROM server?
 * In some codebases, app.js only creates/exports the Express app,
 * and a separate server.js calls app.listen(). This makes the app
 * importable in tests without starting a real server.
 * For this learning project, we keep them together for simplicity.
 *
 * MIDDLEWARE ORDER MATTERS:
 * Express runs middleware in registration order.
 * - Body parsing must come before routes that read req.body
 * - CORS must come before routes to add headers to all responses
 * - Error handling must come after routes to catch route errors
 */

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// ── Global Middleware ──────────────────────────────────────────

// CORS: Allow the frontend to make requests to this API.
// In production, this should be the specific domain, not a wildcard.
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Parse JSON request bodies
// Without this, req.body would be undefined
app.use(express.json());

// Parse URL-encoded form data (for traditional HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (config.isDev) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(
        `${statusColor}${res.statusCode}\x1b[0m ${req.method} ${req.path} ${duration}ms`
      );
    });
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────────

// Health check endpoint — useful for load balancers and monitoring
// Returns 200 immediately without hitting the DB
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes — all prefixed with /api
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// ── Error Handling ─────────────────────────────────────────────
// These must be LAST — after all routes

app.use(notFound);     // 404 handler for unknown routes
app.use(errorHandler); // Global error handler for all thrown errors

// ── Start Server ───────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════╗
║       TaskFlow API Server              ║
╠════════════════════════════════════════╣
║  Environment : ${config.env.padEnd(22)}║
║  Port        : ${String(config.port).padEnd(22)}║
║  Frontend    : ${config.frontendUrl.padEnd(22)}║
╚════════════════════════════════════════╝
  `);
});

export default app;
