// src/index.js pour chaque service backend

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const logger = require('./logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares de base
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ai-service' });
});

// Routes
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

// Error handler
app.use(errorHandler);

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`ai-service listening at http://localhost:${port}`);
});
