/**
 * Point d'entrée principal du db-service
 * 
 * Initialise et démarre le serveur Express avec :
 * - Configuration des variables d'environnement
 * - Construction de l'application Express avec Prisma
 * - Démarrage du serveur HTTP
 * - Logging du démarrage
 * 
 * @author SupervIA Team
 */

// backend/db-service/src/index.js
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3000;

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`db-service listening at http://localhost:${port}`);
});
