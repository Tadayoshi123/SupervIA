// backend/notification-service/src/routes/notificationRoutes.js
const express = require('express');
const { sendTestEmail, sendWelcomeEmail } = require('../controllers/notificationController');
const authenticateRequest = require('../middleware/authenticateToken');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoints pour l'envoi de notifications par email
 */

/**
 * @swagger
 * /api/notifications/email/send:
 *   post:
 *     summary: Envoie un email
 *     tags: [Notifications]
 *     description: Envoie un email via le service configuré. L'endpoint est protégé et requiert un token JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - text
 *             properties:
 *               to:
 *                 type: string
 *                 description: L'adresse email du destinataire.
 *                 example: "test@example.com"
 *               subject:
 *                 type: string
 *                 description: Le sujet de l'email.
 *                 example: "Sujet de test"
 *               text:
 *                 type: string
 *                 description: Le corps du message en texte brut.
 *                 example: "Ceci est un message de test."
 *               html:
 *                 type: string
 *                 description: Le corps du message au format HTML (optionnel).
 *                 example: "<h1>Ceci est un message de test.</h1>"
 *     responses:
 *       200:
 *         description: Email envoyé avec succès.
 *       400:
 *         description: Données manquantes dans la requête.
 *       401:
 *         description: Non autorisé (token manquant ou invalide).
 *       500:
 *         description: Erreur interne du serveur lors de l'envoi.
 */
router.post('/email/send', authenticateRequest, sendTestEmail);

/**
 * @swagger
 * /api/notifications/email/welcome:
 *   post:
 *     summary: Envoie un email de bienvenue après inscription
 *     tags: [Notifications]
 *     description: Envoie un email de bienvenue personnalisé à un nouvel utilisateur. Endpoint destiné aux appels internes entre services.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 description: L'adresse email du nouvel utilisateur.
 *                 example: "nouveau@example.com"
 *               name:
 *                 type: string
 *                 description: Le nom du nouvel utilisateur (optionnel).
 *                 example: "Jean Dupont"
 *     responses:
 *       200:
 *         description: Email de bienvenue envoyé avec succès.
 *       400:
 *         description: Données manquantes dans la requête.
 *       401:
 *         description: Non autorisé (token ou clé API manquant/invalide).
 *       500:
 *         description: Erreur interne du serveur lors de l'envoi.
 */
router.post('/email/welcome', authenticateRequest, sendWelcomeEmail);

module.exports = router;
