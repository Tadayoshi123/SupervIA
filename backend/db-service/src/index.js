// backend/db-service/src/index.js
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

// Middleware pour la documentation Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middlewares de base
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

// Middleware d'authentification interne pour toutes les routes de l'API
const authenticateInternalRequest = require('./middleware/authenticateInternalRequest');
app.use('/api', authenticateInternalRequest);


// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'db-service' });
});

// Importation des routes
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Utilisation des routes avec un préfixe /api
app.use('/api', userRoutes);
app.use('/api', dashboardRoutes);

// Middleware de gestion des erreurs (doit être le dernier)
app.use(errorHandler);

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`db-service listening at http://localhost:${port}`);
});
