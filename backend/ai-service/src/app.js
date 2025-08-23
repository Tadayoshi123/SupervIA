/**
 * Configuration de l'application Express pour l'ai-service
 * 
 * Configure une application Express complète avec :
 * - Middlewares de sécurité (CORS, Helmet)
 * - Documentation Swagger UI
 * - Rate limiting pour les endpoints IA
 * - Gestion d'erreurs centralisée
 * - Routes d'intelligence artificielle
 * 
 * @author SupervIA Team
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');

/**
 * Construit et configure l'application Express
 * 
 * @returns {import('express').Application} Application Express configurée
 */
function buildApp() {
  const app = express();

  // Swagger
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Middlewares de base
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Api-Key'],
  }));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/ai', aiLimiter);

  // Health endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'ai-service' });
  });

  // Routes
  const aiRoutes = require('./routes/aiRoutes');
  app.use('/api/ai', aiRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
