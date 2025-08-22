// backend/metrics-service/src/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
const metricsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api/metrics', metricsLimiter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'metrics-service' });
});

// Routes
const metricsRoutes = require('./routes/metricsRoutes');
app.use('/api/metrics', metricsRoutes);

// Error Handler
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`metrics-service listening at http://localhost:${port}`);
});
