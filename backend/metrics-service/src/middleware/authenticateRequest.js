/**
 * Middleware d'authentification dual pour le metrics-service
 * 
 * Supporte deux types d'authentification :
 * 1. Service-à-service avec X-Internal-Api-Key
 * 2. Utilisateur avec JWT Bearer token
 * 
 * @author SupervIA Team
 */

// backend/metrics-service/src/middleware/authenticateRequest.js
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Middleware d'authentification avec support dual (API Key + JWT)
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Passe au middleware suivant ou retourne 401
 */
const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const internalApiKey = req.headers['x-internal-api-key'];

  // Cas 1: Authentification interne de service-à-service
  if (internalApiKey) {
    if (internalApiKey === process.env.INTERNAL_API_KEY) {
      req.user = { id: 'internal-service', roles: ['service'] };
      return next();
    } else {
      logger.warn('Tentative d\'accès interne au metrics-service avec une clé API invalide.');
      return res.sendStatus(401);
    }
  }

  // Cas 2: Authentification utilisateur via JWT
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    logger.warn('Accès non autorisé au metrics-service (token ou clé API manquants).');
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.error({ err }, 'Échec de la vérification du token JWT pour le metrics-service.');
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateRequest;
