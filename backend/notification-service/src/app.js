/**
 * Configuration de l'application Express pour le notification-service
 * 
 * Configure une application Express complète avec :
 * - Middlewares de sécurité (CORS, Helmet)
 * - Authentification dual (JWT + clé API interne)
 * - Support WebSocket via Socket.io
 * - Documentation Swagger UI
 * - Rate limiting pour les emails
 * - Gestion d'erreurs centralisée
 * 
 * @author SupervIA Team
 */

// backend/notification-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const notificationRoutes = require('./routes/notificationRoutes');
const rateLimit = require('express-rate-limit');

/**
 * Construit et configure l'application Express pour les notifications
 * 
 * @returns {import('express').Application} Application Express configurée avec SMTP et WebSocket
 */
function buildApp() {
  const app = express();

  // Swagger
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Middlewares
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-Api-Key'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting pour les endpoints notifications
  const notifLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/notifications', notifLimiter);

  // io stub (remplacé par le vrai Socket.io dans index.js)
  app.set('io', { emit: () => {} });

  // Health
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'notification-service' });
  });

  // Routes
  app.use('/api/notifications', notificationRoutes);

  // Error handler en dernier
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };


