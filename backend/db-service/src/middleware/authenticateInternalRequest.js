// backend/db-service/src/middleware/authenticateInternalRequest.js
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');

const authenticateInternalRequest = (req, res, next) => {
  const internalApiKey = req.headers['x-internal-api-key'];
  if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }

  // Alternative: accepter un JWT Bearer émis par auth-service
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    logger.warn("Accès non autorisé (pas de clé interne ni de JWT)");
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    logger.warn('JWT invalide pour db-service');
    return res.status(403).json({ error: 'Forbidden' });
  }
};

module.exports = authenticateInternalRequest;
