/**
 * Configuration de l'application Express pour l'auth-service
 * 
 * Configure une application Express complète avec :
 * - Middlewares de sécurité (CORS, Helmet)
 * - Authentification OAuth2 (Google, GitHub) via Passport
 * - Gestion de sessions Express
 * - Documentation Swagger UI
 * - Rate limiting pour la sécurité
 * - Gestion d'erreurs centralisée
 * 
 * @author SupervIA Team
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const session = require('express-session');
const passport = require('passport');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
require('./config/passport');

/**
 * Construit et configure l'application Express avec authentification
 * 
 * @returns {import('express').Application} Application Express configurée avec OAuth2
 */
function buildApp() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const authLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/auth', authLimiter);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'super-secret-key-pour-le-dev',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        maxAge: 1000 * 60 * 60,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'auth-service' }));

  const authRoutes = require('./routes/authRoutes');
  const oauthRoutes = require('./routes/oauthRoutes');
  app.use('/auth', authRoutes);
  app.use('/auth', oauthRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { buildApp };


