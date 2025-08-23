/**
 * Gestionnaire d'erreurs centralisé pour l'ai-service
 * 
 * Middleware Express de gestion d'erreurs qui :
 * - Loggue les erreurs avec contexte de requête
 * - Retourne des réponses JSON standardisées
 * - Masque les détails internes en production
 * 
 * @author SupervIA Team
 */

const logger = require('../logger');

/**
 * Middleware de gestion d'erreurs Express
 * 
 * @param {Error} err - Erreur capturée
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Envoie une réponse JSON d'erreur
 */
module.exports = (err, req, res, next) => {
  logger.error({ err, url: req.originalUrl, method: req.method }, 'AI service error');
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
};


