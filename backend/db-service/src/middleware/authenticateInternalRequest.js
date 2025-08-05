// backend/db-service/src/middleware/authenticateInternalRequest.js
const logger = require('../config/logger');

const authenticateInternalRequest = (req, res, next) => {
  const internalApiKey = req.headers['x-internal-api-key'];

  if (!internalApiKey || internalApiKey !== process.env.INTERNAL_API_KEY) {
    logger.warn('Tentative d\'accès non autorisée au db-service (clé API manquante ou invalide).');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // La clé est valide, la requête peut continuer.
  next();
};

module.exports = authenticateInternalRequest;
