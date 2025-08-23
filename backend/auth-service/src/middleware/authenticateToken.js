/**
 * Middleware d'authentification JWT pour l'auth-service
 * 
 * Vérifie et décode les tokens JWT Bearer pour l'authentification utilisateur.
 * Utilisé pour protéger les endpoints nécessitant une authentification.
 * 
 * @author SupervIA Team
 */

// backend/auth-service/src/middleware/authenticateToken.js
const jwt = require('jsonwebtoken');

/**
 * Middleware d'authentification par token JWT
 * @param {import('express').Request} req - Requête Express avec header Authorization
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {void} Passe au middleware suivant ou retourne 401/403
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden (token is no longer valid)
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
