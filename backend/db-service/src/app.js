/**
 * Configuration de l'application Express pour le db-service
 * 
 * Configure une application Express complète avec :
 * - Middlewares de sécurité (CORS, Helmet)
 * - Authentification strictement interne (clé API)
 * - Documentation Swagger UI
 * - Rate limiting pour la protection
 * - Gestion d'erreurs centralisée
 * - Routes utilisateurs et dashboards
 * 
 * @author SupervIA Team
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const authenticateInternalRequest = require('./middleware/authenticateInternalRequest');

/**
 * Construit et configure l'application Express pour la base de données
 * 
 * @returns {import('express').Application} Application Express configurée avec Prisma
 */
function buildApp() {
  const app = express();

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Api-Key'],
  }));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  const dbLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/api', dbLimiter);

  // Health
  app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'db-service' }));

  // Routes sécurisées par clé interne
  app.use('/api', authenticateInternalRequest);
  const userRoutes = require('./routes/userRoutes');
  const dashboardRoutes = require('./routes/dashboardRoutes');
  app.use('/api', userRoutes);
  app.use('/api', dashboardRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { buildApp };


