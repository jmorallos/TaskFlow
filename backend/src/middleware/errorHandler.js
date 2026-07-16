/**
 * Global Error Handler Middleware
 *
 * WHY A CENTRALIZED ERROR HANDLER?
 * Without this, every route would need its own try/catch with its own
 * error formatting. A centralized handler means:
 * - Consistent error response format across the entire API
 * - One place to add logging/monitoring
 * - Developers call next(error) instead of formatting errors inline
 *
 * HOW EXPRESS ERROR HANDLING WORKS:
 * Express identifies error handlers by their 4 arguments: (err, req, res, next).
 * Regular middleware has 3: (req, res, next).
 * Error handling middleware MUST be registered LAST, after all routes.
 *
 * ERROR RESPONSE FORMAT:
 * All API errors follow this shape:
 * {
 *   "error": "Human-readable message",
 *   "code": "MACHINE_READABLE_CODE",   // Optional, for client-side handling
 *   "details": {}                       // Optional, for validation errors
 * }
 */

import config from '../config/index.js';

/**
 * Global error handling middleware.
 * Must be the last app.use() call in app.js.
 */
export function errorHandler(err, req, res, next) {
  // Log the error in development for debugging
  if (config.isDev) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } else {
    // In production, log to your monitoring service (Sentry, Datadog, etc.)
    // Never log sensitive user data
    console.error(`Error ${err.status || 500}: ${err.message}`);
  }

  // Handle known error types with appropriate HTTP status codes

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // PostgreSQL unique constraint violation
  // err.code '23505' is the PostgreSQL error code for unique_violation
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'A record with this value already exists',
      code: 'DUPLICATE_ENTRY',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced record does not exist',
      code: 'FOREIGN_KEY_VIOLATION',
    });
  }

  // Our own thrown errors with status codes
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  // Unknown error — return 500 but don't leak error details to the client
  // in production (they might reveal implementation details)
  res.status(500).json({
    error: config.isDev ? err.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  });
}

/**
 * 404 handler — catches requests to undefined routes.
 * Must be registered AFTER all routes but BEFORE the error handler.
 */
export function notFound(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}

/**
 * Helper to create application errors with status codes.
 * Controllers use this to throw structured errors.
 *
 * @example
 * throw createError(403, 'You do not have permission', 'FORBIDDEN')
 */
export function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
