// backend/auth-service/src/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const passport = require('passport');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
require('./config/passport'); // Important: Cela exécute le code de configuration de Passport

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares de base
app.use(cors());
app.use(helmet());
app.use(express.json());

// Configuration de la session express - requis pour Passport OAuth
// Note: Pour la production, utilisez un store de session plus robuste (ex: connect-redis)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super-secret-key-pour-le-dev', // Fallback pour le développement
    resave: false,
    saveUninitialized: false, // Ne pas créer de session avant l'authentification
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Mettre `true` en production (HTTPS)
      httpOnly: true,
    },
  })
);

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware pour la documentation Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

// Importation des routes
const authRoutes = require('./routes/authRoutes');
const oauthRoutes = require('./routes/oauthRoutes');

// Utilisation des routes
app.use('/auth', authRoutes);
app.use('/auth', oauthRoutes); // Routes pour Google & GitHub

// Middleware de gestion des erreurs (doit être le dernier)
app.use(errorHandler);

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`auth-service listening at http://localhost:${port}`);
});
