/**
 * Middleware d'authentification strictement interne pour le db-service
 * 
 * Vérifie uniquement la clé API interne pour les communications service-à-service.
 * Utilisé pour protéger les endpoints internes comme /api/internal/*
 * 
 * @author SupervIA Team
 */

// backend/db-service/src/middleware/authenticateInternalRequest.js
const logger = require('../config/logger');

/**
 * Middleware d'authentification par clé API interne uniquement
 * @param {import('express').Request} req - Requête Express avec header X-Internal-Api-Key
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Passe au middleware suivant ou retourne 401
 */
const authenticateInternalRequest = (req, res, next) => {
  const internalApiKey = req.headers['x-internal-api-key'];
  if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }
  logger.warn('Accès non autorisé au db-service (clé interne manquante/invalide)');
  return res.status(401).json({ error: 'Unauthorized' });
};

module.exports = authenticateInternalRequest;
