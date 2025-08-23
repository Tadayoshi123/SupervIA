/**
 * Point d'entrée principal de l'ai-service
 * 
 * Initialise et démarre le serveur Express avec :
 * - Configuration des variables d'environnement
 * - Construction de l'application Express
 * - Démarrage du serveur HTTP
 * - Logging du démarrage
 * 
 * @author SupervIA Team
 */

const dotenv = require('dotenv');
const logger = require('./logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3000;

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`ai-service listening at http://localhost:${port}`);
});
