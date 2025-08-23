// backend/db-service/src/routes/dashboardRoutes.js
const express = require('express');
const { createDashboard, listDashboards, getDashboard, updateDashboard, deleteDashboard } = require('../controllers/dashboardController');

const router = express.Router();

// Tous ces endpoints sont protégés par authenticateInternalRequest au niveau de /api dans index.js

/**
 * @swagger
 * tags:
 *   name: Dashboards
 *   description: Gestion des dashboards utilisateurs
 */

/**
 * @swagger
 * /api/dashboards:
 *   post:
 *     summary: Créer un dashboard
 *     tags: [Dashboards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, userId, widgets]
 *             properties:
 *               name:
 *                 type: string
 *               userId:
 *                 type: integer
 *               widgets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type: { type: string }
 *                     title: { type: string }
 *                     x: { type: integer }
 *                     y: { type: integer }
 *                     width: { type: integer }
 *                     height: { type: integer }
 *                     hostId: { type: string, nullable: true }
 *                     itemId: { type: string, nullable: true }
 *                     config: { type: object, nullable: true }
 *     responses:
 *       201:
 *         description: Dashboard créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       401:
 *         description: Clé API interne manquante ou invalide
 */
router.post('/dashboards', createDashboard);

/**
 * @swagger
 * /api/users/{userId}/dashboards:
 *   get:
 *     summary: Lister les dashboards d'un utilisateur
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des dashboards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dashboard'
 *       401:
 *         description: Clé API interne manquante ou invalide
 */
router.get('/users/:userId/dashboards', listDashboards);

/**
 * @swagger
 * /api/dashboards/{id}:
 *   get:
 *     summary: Récupérer un dashboard par id
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dashboard
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       401:
 *         description: Clé API interne manquante ou invalide
 *   put:
 *     summary: Mettre à jour un dashboard (nom + widgets)
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               widgets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Dashboard mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       401:
 *         description: Clé API interne manquante ou invalide
 *   delete:
 *     summary: Supprimer un dashboard
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimé
 *       401:
 *         description: Clé API interne manquante ou invalide
 */
router.get('/dashboards/:id', getDashboard);
router.put('/dashboards/:id', updateDashboard);
router.delete('/dashboards/:id', deleteDashboard);

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardWidget:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         type:
 *           type: string
 *         title:
 *           type: string
 *         x:
 *           type: integer
 *         y:
 *           type: integer
 *         width:
 *           type: integer
 *         height:
 *           type: integer
 *         hostId:
 *           type: string
 *           nullable: true
 *         itemId:
 *           type: string
 *           nullable: true
 *         config:
 *           type: object
 *           nullable: true
 *     Dashboard:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         widgets:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DashboardWidget'
 */

module.exports = router;


