// ============================================================
//  REWA KRIPA TRAVELS — Request Logger Middleware
//  src/middleware/requestLogger.js
// ============================================================

const COLORS = {
  GET   : '\x1b[32m',
  POST  : '\x1b[34m',
  PUT   : '\x1b[33m',
  PATCH : '\x1b[33m',
  DELETE: '\x1b[31m',
  RESET : '\x1b[0m',
};

function requestLogger(req, res, next) {
  const start = Date.now();
  const color = COLORS[req.method] || COLORS.RESET;

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const sc     = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `${color}${req.method}${COLORS.RESET} ${req.originalUrl} ` +
      `${sc}${status}${COLORS.RESET} — ${ms}ms`
    );
  });

  next();
}

module.exports = { requestLogger };
