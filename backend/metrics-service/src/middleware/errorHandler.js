// backend/metrics-service/src/middleware/errorHandler.js
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode,
    ...(statusCode >= 500 ? { stack: err.stack } : {}),
  };

  if (statusCode >= 500) {
    logger.error(payload, 'An unhandled error occurred in metrics-service');
  } else {
    logger.warn(payload, 'Handled client error in metrics-service');
  }

  const message = err.statusCode ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.stack }),
  });
};

module.exports = errorHandler;
