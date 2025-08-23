/**
 * Point d'entrée principal du metrics-service
 * 
 * Initialise et démarre le serveur Express avec :
 * - Configuration des variables d'environnement
 * - Construction de l'application Express avec Zabbix
 * - Démarrage du serveur HTTP
 * - Logging du démarrage
 * 
 * @author SupervIA Team
 */

// backend/metrics-service/src/index.js
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`metrics-service listening at http://localhost:${port}`);
});
