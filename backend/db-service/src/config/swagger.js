// backend/db-service/src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SupervIA - DB Service API',
    version: '1.0.0',
    description: 'API pour gérer les interactions avec la base de données centralisée.',
  },
  servers: [
    {
      url: process.env.DB_SERVICE_URL || 'http://localhost:3001',
      description: 'Serveur de développement',
    },
  ],
  components: {
    securitySchemes: {
      internalApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Internal-Api-Key',
        description: 'Clé API interne requise pour toutes les routes /api du db-service',
      },
    },
  },
  security: [
    { internalApiKey: [] },
  ],
};

const options = {
  swaggerDefinition,
  // Chemin vers les fichiers contenant les annotations pour l'API
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
