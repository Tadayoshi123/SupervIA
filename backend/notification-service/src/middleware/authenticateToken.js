// backend/notification-service/src/middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const internalApiKey = req.headers['x-internal-api-key'];

  // --- Cas 1: Authentification interne de service-à-service ---
  if (internalApiKey) {
    if (internalApiKey === process.env.INTERNAL_API_KEY) {
      // La clé est valide, on considère la requête comme authentifiée.
      // On peut éventuellement ajouter une information pour savoir que c'est un service.
      req.user = { id: 'internal-service', roles: ['service'] };
      return next();
    } else {
      // La clé est présente mais invalide.
      logger.warn('Tentative d\'accès interne avec une clé API invalide.');
      return res.sendStatus(401); // Unauthorized
    }
  }

  // --- Cas 2: Authentification utilisateur via JWT ---
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (token == null) {
    // Si aucune méthode d'authentification n'est fournie
    logger.warn('Accès non autorisé (token ou clé API manquants) à une ressource protégée.');
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.error({ err }, 'Échec de la vérification du token JWT.');
      return res.sendStatus(403); // Forbidden (token invalide ou expiré)
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateRequest;
