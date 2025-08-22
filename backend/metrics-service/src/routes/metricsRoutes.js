// backend/metrics-service/src/routes/metricsRoutes.js
const express = require('express');
const { getZabbixHosts, getZabbixItemsForHost, getZabbixProblems, getHostsSummary, getTopItemsForHost, getItemHistory } = require('../controllers/zabbixController');
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
 * /api/metrics/hosts/summary:
 *   get:
 *     summary: Résumé des hôtes (total / en ligne / hors ligne)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques d'hôtes
 */
router.get('/hosts/summary', authenticateRequest, getHostsSummary);

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
 * /api/metrics/items/{hostid}/top:
 *   get:
 *     summary: Top items numériques d'un hôte pour alimenter des graphiques
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Liste triée des items numériques
 */
router.get('/items/:hostid/top', authenticateRequest, getTopItemsForHost);

/**
 * @swagger
 * /api/metrics/history/{itemid}:
 *   get:
 *     summary: Historique d'un item (timeseries)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           description: "Epoch seconds (défaut: now-3600)"
 *       - in: query
 *         name: to
 *         schema:
 *           type: integer
 *           description: "Epoch seconds (défaut: now)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           description: "Nombre max de points (défaut 500, max 2000)"
 *     responses:
 *       200:
 *         description: Série temporelle normalisée [{clock, value}]
 */
router.get('/history/:itemid', authenticateRequest, getItemHistory);

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
