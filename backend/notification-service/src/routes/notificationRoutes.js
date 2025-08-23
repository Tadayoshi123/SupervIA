// backend/notification-service/src/routes/notificationRoutes.js
const express = require('express');
const { sendTestEmail, sendAlertEmail, sendWelcomeEmail } = require('../controllers/notificationController');
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
 * /api/notifications/email/alert:
 *   post:
 *     summary: Envoie un email d'alerte enrichi
 *     tags: [Notifications]
 *     description: Envoie un email d'alerte avec template enrichi et contexte détaillé. Endpoint optimisé pour les alertes de supervision.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertType
 *               - widgetTitle
 *               - hostName
 *               - metricName
 *               - currentValue
 *               - threshold
 *             properties:
 *               alertType:
 *                 type: string
 *                 description: Type d'alerte (gauge, multiChart, availability, problems, metricValue)
 *                 example: "gauge"
 *               severity:
 *                 type: string
 *                 description: Niveau de sévérité de l'alerte
 *                 enum: [critical, high, medium, warning, info]
 *                 example: "critical"
 *               widgetTitle:
 *                 type: string
 *                 description: Titre du widget qui a déclenché l'alerte
 *                 example: "CPU Usage Monitor"
 *               hostName:
 *                 type: string
 *                 description: Nom de l'hôte concerné
 *                 example: "Docker Host"
 *               metricName:
 *                 type: string
 *                 description: Nom de la métrique
 *                 example: "CPU utilization"
 *               currentValue:
 *                 type: string
 *                 description: Valeur actuelle de la métrique
 *                 example: "95.2"
 *               threshold:
 *                 type: string
 *                 description: Seuil configuré
 *                 example: "90"
 *               units:
 *                 type: string
 *                 description: Unité de mesure
 *                 example: "%"
 *               condition:
 *                 type: string
 *                 description: Condition de déclenchement
 *                 example: "supérieur à"
 *               timestamp:
 *                 type: string
 *                 description: Horodatage de l'alerte (ISO string)
 *                 example: "2024-01-15T10:30:00Z"
 *               dashboardUrl:
 *                 type: string
 *                 description: URL vers le dashboard concerné
 *                 example: "https://supervia.local/dashboard-editor"
 *               additionalContext:
 *                 type: object
 *                 description: Contexte additionnel pour enrichir l'alerte
 *                 properties:
 *                   trend:
 *                     type: string
 *                     example: "En hausse depuis 15 minutes"
 *                   duration:
 *                     type: string
 *                     example: "Alerte active depuis 5 minutes"
 *                   previousValue:
 *                     type: string
 *                     example: "87.3"
 *                   frequency:
 *                     type: string
 *                     example: "3ème alerte en 1 heure"
 *     responses:
 *       200:
 *         description: Alerte envoyée avec succès.
 *       400:
 *         description: Données manquantes dans la requête.
 *       401:
 *         description: Non autorisé (token ou clé API manquant/invalide).
 *       500:
 *         description: Erreur interne du serveur lors de l'envoi.
 */
router.post('/email/alert', authenticateRequest, sendAlertEmail);

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
