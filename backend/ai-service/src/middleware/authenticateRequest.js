const jwt = require('jsonwebtoken');
const logger = require('../logger');

const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const internalApiKey = req.headers['x-internal-api-key'];

  // Cas 1: service-to-service via clé interne
  if (internalApiKey) {
    if (internalApiKey === process.env.INTERNAL_API_KEY) {
      req.user = { id: 'internal-service', roles: ['service'] };
      return next();
    } else {
      logger.warn("Tentative d'accès interne au ai-service avec une clé API invalide.");
      return res.sendStatus(401);
    }
  }

  // Cas 2: utilisateur via JWT
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    logger.warn('Accès non autorisé au ai-service (token ou clé API manquants).');
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.error({ err }, 'Échec de la vérification du token JWT pour le ai-service.');
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateRequest;