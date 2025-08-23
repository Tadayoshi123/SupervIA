/**
 * Gestionnaire d'erreurs centralisé pour l'auth-service
 * 
 * Middleware Express de gestion d'erreurs avec logging différencié :
 * - Erreurs 4xx : warnings (erreurs client)
 * - Erreurs 5xx : errors (erreurs serveur)
 * - Stack trace en développement uniquement
 * 
 * @author SupervIA Team
 */

// backend/auth-service/src/middleware/errorHandler.js
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
  // 4xx => warn (bruit réduit), 5xx => error
  const statusCode = err.statusCode || 500;
  const logPayload = {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode,
    ...(statusCode >= 500 ? { stack: err.stack } : {}),
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'An unhandled error occurred in auth-service');
  } else {
    logger.warn(logPayload, 'Handled client error in auth-service');
  }

  const message = err.statusCode ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.stack }),
  });
};

module.exports = errorHandler;
