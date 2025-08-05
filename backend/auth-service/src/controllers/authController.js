// backend/auth-service/src/controllers/authController.js
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const DB_SERVICE_URL = process.env.DB_SERVICE_URL;
if (!DB_SERVICE_URL) {
  logger.fatal('DB_SERVICE_URL is not defined. Exiting.');
  process.exit(1);
}

const internalApiConfig = {
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY
  }
};

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000';

const register = async (req, res, next) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const response = await axios.post(`${DB_SERVICE_URL}/api/users`, {
        email,
        password: hashedPassword,
        name,
      }, internalApiConfig);

      // Envoi de l'email de confirmation après inscription réussie
      try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/email/welcome`, {
          to: email,
          name: name || 'Nouvel utilisateur'
        }, internalApiConfig);
        logger.info(`Email de bienvenue envoyé à ${email}`);
      } catch (emailError) {
        // On ne fait pas échouer l'inscription si l'email ne peut pas être envoyé
        logger.warn({ err: emailError }, `Impossible d'envoyer l'email de bienvenue à ${email}`);
      }

      res.status(201).json(response.data);
    } catch (error) {
      // Gestion spécifique de l'erreur "Email already exists"
      if (error.response && error.response.status === 409) {
        // Si l'utilisateur existe déjà, on continue avec le login
        logger.info(`User ${email} already exists, proceeding with login flow`);
        return login(req, res, next);
      }
      
      // Pour les autres erreurs, on les transmet au middleware
      if (error.response) {
        error.statusCode = error.response.status;
        error.message = error.response.data.error || 'Error from db-service';
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const userResponse = await axios.get(`${DB_SERVICE_URL}/api/users/email/${email}`, internalApiConfig);
    const user = userResponse.data;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const payload = { id: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Logged in successfully',
      token: token, // Suppression du préfixe "Bearer " pour éviter les problèmes
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      error.statusCode = 401;
      error.message = 'Invalid credentials';
    }
    next(error);
  }
};

const getProfile = (req, res) => {
  res.json(req.user);
};

module.exports = {
  register,
  login,
  getProfile,
};