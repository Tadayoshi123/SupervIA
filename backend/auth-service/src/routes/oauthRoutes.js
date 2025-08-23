// backend/auth-service/src/routes/oauthRoutes.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Fonction utilitaire pour générer un token JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Démarre l'authentification Google (OAuth 2.0)
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirection vers Google
 */
// Route pour démarrer l'authentification Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Callback OAuth Google
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirection vers le frontend avec token en query
 */
// Route de callback pour Google
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login`, session: false }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      // Rediriger vers une page frontend dédiée au traitement du token
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la génération du token après l'authentification Google.");
      res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Démarre l'authentification GitHub (OAuth 2.0)
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirection vers GitHub
 */
// Route pour démarrer l'authentification GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: Callback OAuth GitHub
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirection vers le frontend avec token en query
 */
// Route de callback pour GitHub
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/login`, session: false }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la génération du token après l'authentification GitHub.");
      res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

module.exports = router;
