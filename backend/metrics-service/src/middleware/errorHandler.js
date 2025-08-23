/**
 * Gestionnaire d'erreurs centralisé pour le metrics-service
 * 
 * Middleware Express de gestion d'erreurs avec logging différencié :
 * - Erreurs 4xx : warnings (erreurs client)
 * - Erreurs 5xx : errors (erreurs serveur)
 * - Stack trace conditionnelle selon la sévérité
 * 
 * @author SupervIA Team
 */

// backend/metrics-service/src/middleware/errorHandler.js
const logger = require('../config/logger');

/**
 * Middleware de gestion d'erreurs Express avec logging adaptatif
 * 
 * @param {Error} err - Erreur capturée avec statusCode optionnel
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Envoie une réponse JSON d'erreur avec détails selon l'environnement
 */
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
