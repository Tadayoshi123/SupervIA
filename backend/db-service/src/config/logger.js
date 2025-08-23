/**
 * Configuration du logger Pino pour le db-service
 * 
 * Logger centralisé avec :
 * - Niveau configurable via LOG_LEVEL
 * - Pretty printing en développement avec pino-pretty
 * - Format JSON structuré en production
 * - Timestamps localisés et filtrage des métadonnées
 * 
 * @author SupervIA Team
 */

// backend/db-service/src/config/logger.js
const pino = require('pino');

/**
 * Instance du logger Pino avec transport conditionnel
 * @type {import('pino').Logger}
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

module.exports = logger;
