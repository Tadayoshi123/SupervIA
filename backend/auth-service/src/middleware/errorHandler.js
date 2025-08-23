// backend/auth-service/src/middleware/errorHandler.js
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // 4xx => warn (bruit réduit), 5xx => error
  const statusCode = err.statusCode || 500;
  const logPayload = {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode,
    ...(statusCode >= 500 ? { stack: err.stack } : {}),
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'An unhandled error occurred in auth-service');
  } else {
    logger.warn(logPayload, 'Handled client error in auth-service');
  }

  const message = err.statusCode ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.stack }),
  });
};

module.exports = errorHandler;
