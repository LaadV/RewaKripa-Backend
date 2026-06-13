// ============================================================
//  REWA KRIPA TRAVELS — Error Handler Middleware
//  src/middleware/errorHandler.js
// ============================================================

/**
 * Express global error handler.
 * Must have exactly 4 params so Express recognises it as error middleware.
 */
function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`\n❌  [${req.method}] ${req.originalUrl}`);
    console.error(err);
  } else {
    console.error(`❌  ${err.message}`);
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.expose || process.env.NODE_ENV !== 'production'
    ? err.message
    : 'Internal server error';

  res.status(status).json({ success: false, error: message });
}

/**
 * Creates an error with a specific HTTP status code.
 * Usage: throw createError(404, 'Bus not found')
 */
function createError(statusCode, message) {
  const err      = new Error(message);
  err.statusCode = statusCode;
  err.expose     = true;
  return err;
}

module.exports = { errorHandler, createError };
