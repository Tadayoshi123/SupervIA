const logger = require('../logger');

module.exports = (err, req, res, next) => {
  logger.error({ err, url: req.originalUrl, method: req.method }, 'AI service error');
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
};


