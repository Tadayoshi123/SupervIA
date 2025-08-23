// backend/metrics-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const metricsRoutes = require('./routes/metricsRoutes');

function buildApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const metricsLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/metrics', metricsLimiter);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'metrics-service' });
  });

  app.use('/api/metrics', metricsRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };


