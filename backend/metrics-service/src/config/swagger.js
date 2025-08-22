// backend/metrics-service/src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SupervIA - Metrics Service API',
    version: '1.0.0',
    description: 'API pour récupérer les métriques depuis Zabbix.',
  },
  servers: [
    {
      url: process.env.METRICS_SERVICE_URL || 'http://localhost:3003', // Port du metrics-service
      description: 'Serveur de développement',
    },
  ],
   components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
