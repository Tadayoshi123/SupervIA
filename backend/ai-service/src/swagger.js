const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SupervIA - AI Service API',
    version: '1.0.0',
    description: 'Endpoints IA (suggestions, thresholds, anomalies, predict, summarize, generate title)',
  },
  servers: [{ url: process.env.AI_SERVICE_URL || 'http://localhost:3005', description: 'Dev' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      TimePoint: {
        type: 'object',
        properties: { ts: { type: 'number' }, value: { type: 'number' } },
        required: ['ts', 'value']
      },
      ThresholdsRequest: {
        type: 'object',
        properties: { values: { type: 'array', items: { type: 'number' } } },
        required: ['values']
      },
      ThresholdsResponse: {
        type: 'object',
        properties: { warning: { type: 'number' }, critical: { type: 'number' } },
        required: ['warning','critical']
      },
      AnomalyRequest: {
        type: 'object',
        properties: { series: { type: 'array', items: { $ref: '#/components/schemas/TimePoint' } } },
        required: ['series']
      },
      AnomalyResponse: {
        type: 'object',
        properties: { anomalies: { type: 'array', items: { $ref: '#/components/schemas/TimePoint' } } },
        required: ['anomalies']
      },
      PredictRequest: {
        type: 'object',
        properties: {
          series: { type: 'array', items: { $ref: '#/components/schemas/TimePoint' } },
          horizon: { type: 'number', default: 5 }
        },
        required: ['series']
      },
      PredictResponse: {
        type: 'object',
        properties: {
          slope: { type: 'number' },
          forecast: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, value: { type: 'number' } } } }
        },
        required: ['slope','forecast']
      },
      SuggestWidgetsRequest: {
        type: 'object',
        properties: {
          hostId: { type: 'string' },
          items: {
            type: 'array',
            description: 'Items Zabbix connus pour l\'hôte pour améliorer la pertinence',
            items: {
              type: 'object',
              properties: {
                itemid: { type: 'string' },
                name: { type: 'string' },
                key_: { type: 'string' },
                value_type: { type: 'string' },
                units: { type: 'string' },
                lastvalue: { type: 'string' }
              }
            }
          }
        }
      },
      SuggestWidgetsResponse: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['multiChart','gauge','availability','metricValue'] },
            title: { type: 'string' },
            hostId: { type: 'string' },
            itemId: { type: 'string', description: 'Uniquement pour les widgets mono-métrique' },
            config: { type: 'object' }
          },
          required: ['type','title']
        }
      },
      SummarizeRequest: {
        type: 'object',
        properties: { 
          problemsCount: { type: 'number' }, 
          hostsOnline: { type: 'number' }, 
          hostsTotal: { type: 'number' },
          problems: { type: 'array', items: { type: 'object' }, description: 'Liste des problèmes détectés avec sévérité' },
          widgets: { type: 'array', items: { type: 'object' }, description: 'Widgets actifs du dashboard' },
          topMetrics: { type: 'array', items: { type: 'object' }, description: 'Métriques principales avec valeurs' },
          dashboardStats: { type: 'object', description: 'Statistiques du dashboard' },
          timeRange: { type: 'string', description: 'Période d\'analyse', default: '1h' }
        }
      },
      SummarizeResponse: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text']
      },
      GenerateTitleRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['multiChart','gauge','availability','metricValue'] },
          items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } }
        }
      },
      GenerateTitleResponse: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/ai/thresholds': {
      post: {
        tags: ['AI'], summary: 'Calcule des seuils auto (percentiles 80/95)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ThresholdsRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ThresholdsResponse' } } } } }
      }
    },
    '/api/ai/anomaly': {
      post: {
        tags: ['AI'], summary: 'Détection d’anomalies (z-score > 3)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AnomalyRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AnomalyResponse' } } } } }
      }
    },
    '/api/ai/predict': {
      post: {
        tags: ['AI'], summary: 'Prévision linéaire (OLS) sur horizon demandé',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PredictRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PredictResponse' } } } } }
      }
    },
    '/api/ai/suggest/widgets': {
      post: {
        tags: ['AI'], summary: 'Suggestions de widgets',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SuggestWidgetsRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuggestWidgetsResponse' } } } } }
      }
    },
    '/api/ai/summarize': {
      post: {
        tags: ['AI'], summary: 'Résumé texte (placeholder ou LLM)',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SummarizeRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/SummarizeResponse' } } } } }
      }
    },
    '/api/ai/generate/title': {
      post: {
        tags: ['AI'], summary: 'Génération d’un titre court (placeholder ou LLM)',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateTitleRequest' } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateTitleResponse' } } } } }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);


