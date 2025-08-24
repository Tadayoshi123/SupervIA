// backend/notification-service/src/config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SupervIA - Notification Service API',
    version: '1.2.0',
    description: `API pour gérer l'envoi de notifications (emails, websockets) avec système de batch d'alertes.
    
**Nouvelles fonctionnalités v1.2.0 :**
- 🆕 Système de batch d'alertes pour éviter le spam d'emails
- 📧 Templates HTML enrichis pour alertes groupées
- ⏱️ Collecte automatique sur 30 secondes avec envoi groupé
- 📊 Regroupement intelligent par sévérité et hôte
- 🔧 Endpoints d'administration pour gestion du batch`,
  },
  servers: [
    {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
      description: 'Serveur de développement',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT pour authentification utilisateur',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-KEY',
        description: 'Clé API pour authentification inter-services',
      },
    },
    schemas: {
      AlertBatchRequest: {
        type: 'object',
        required: ['alertType', 'widgetTitle', 'hostName', 'metricName'],
        properties: {
          alertType: {
            type: 'string',
            enum: ['gauge', 'multiChart', 'availability', 'problems', 'metricValue'],
            description: 'Type de widget qui a déclenché l\'alerte',
            example: 'multiChart'
          },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'warning', 'info'],
            default: 'warning',
            description: 'Niveau de sévérité de l\'alerte',
            example: 'warning'
          },
          widgetTitle: {
            type: 'string',
            description: 'Titre du widget qui a déclenché l\'alerte',
            example: 'Performance Système'
          },
          hostName: {
            type: 'string',
            description: 'Nom de l\'hôte concerné par l\'alerte',
            example: 'DB Service'
          },
          metricName: {
            type: 'string',
            description: 'Nom de la métrique surveillée',
            example: 'CPU utilization'
          },
          currentValue: {
            oneOf: [
              { type: 'string' },
              { type: 'number' }
            ],
            description: 'Valeur actuelle qui a déclenché l\'alerte',
            example: 85.5
          },
          threshold: {
            oneOf: [
              { type: 'string' },
              { type: 'number' }
            ],
            description: 'Seuil configuré pour l\'alerte',
            example: 80
          },
          units: {
            type: 'string',
            description: 'Unité de mesure (%, MB, etc.)',
            example: '%'
          },
          condition: {
            type: 'string',
            description: 'Description de la condition de déclenchement',
            example: 'supérieur à 80'
          },
          additionalContext: {
            type: 'object',
            description: 'Contexte additionnel (tendance, durée, fréquence)',
            properties: {
              trend: {
                type: 'string',
                description: 'Tendance de la métrique',
                example: 'increasing'
              },
              duration: {
                type: 'string',
                description: 'Durée de la condition',
                example: '5 minutes'
              },
              frequency: {
                type: 'string',
                description: 'Fréquence d\'alerte',
                example: '3ème alerte en 10 minutes'
              }
            }
          }
        }
      },
      AlertBatchResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Alerte ajoutée au batch avec succès.'
          },
          batchInfo: {
            type: 'object',
            properties: {
              alertsInBatch: {
                type: 'number',
                description: 'Nombre d\'alertes en attente dans le batch',
                example: 3
              },
              batchDuration: {
                type: 'number',
                description: 'Durée du batch en millisecondes',
                example: 30000
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Message d\'erreur',
            example: 'Paramètres requis manquants'
          }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: [],
    },
    {
      ApiKeyAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
