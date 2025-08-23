/**
 * Gestionnaire d'erreurs centralisé pour le db-service
 * 
 * Middleware Express de gestion d'erreurs avec logging complet :
 * - Logs détaillés avec stack trace et contexte de requête
 * - Masquage des détails sensibles en production
 * - Codes de statut appropriés selon le type d'erreur
 * 
 * @author SupervIA Team
 */

// backend/db-service/src/middleware/errorHandler.js
const logger = require('../config/logger');

/**
 * Middleware de gestion d'erreurs Express avec logging complet
 * 
 * @param {Error} err - Erreur capturée avec statusCode optionnel
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Envoie une réponse JSON d'erreur sécurisée
 */
const errorHandler = (err, req, res, next) => {
  // Définir un code de statut par défaut ou utiliser celui de l'erreur
  const statusCode = err.statusCode || 500;

  // Log l'erreur avec pino, en incluant des détails sur la requête
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode: statusCode
    },
    'An unhandled error occurred'
  );

  // Ne pas exposer les détails de l'erreur en production
  const response = {
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;