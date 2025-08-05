// backend/metrics-service/src/routes/metricsRoutes.js
const express = require('express');
const { getZabbixHosts, getZabbixItemsForHost, getZabbixProblems } = require('../controllers/zabbixController');
const authenticateRequest = require('../middleware/authenticateRequest'); 

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Récupération des métriques et des données depuis Zabbix
 */

/**
 * @swagger
 * /api/metrics/hosts:
 *   get:
 *     summary: Récupère la liste des hôtes supervisés par Zabbix
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Une liste d'hôtes Zabbix
 *       401:
 *         description: Non autorisé
 */
router.get('/hosts', authenticateRequest, getZabbixHosts);

/**
 * @swagger
 * /api/metrics/items/{hostid}:
 *   get:
 *     summary: Récupère la liste des items (métriques) pour un hôte spécifique
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostid
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'hôte Zabbix
 *     responses:
 *       200:
 *         description: Une liste d'items Zabbix pour l'hôte spécifié
 *       401:
 *         description: Non autorisé
 */
router.get('/items/:hostid', authenticateRequest, getZabbixItemsForHost);

/**
 * @swagger
 * /api/metrics/problems:
 *   get:
 *     summary: Récupère la liste des problèmes (alertes) actifs dans Zabbix
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Une liste des problèmes actifs
 *       401:
 *         description: Non autorisé
 */
router.get('/problems', authenticateRequest, getZabbixProblems);


module.exports = router;
