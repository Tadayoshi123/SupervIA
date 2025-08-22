// backend/db-service/src/middleware/authenticateInternalRequest.js
const logger = require('../config/logger');

// Authentification STRICTEMENT interne par clé API
const authenticateInternalRequest = (req, res, next) => {
  const internalApiKey = req.headers['x-internal-api-key'];
  if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }
  logger.warn('Accès non autorisé au db-service (clé interne manquante/invalide)');
  return res.status(401).json({ error: 'Unauthorized' });
};

module.exports = authenticateInternalRequest;
