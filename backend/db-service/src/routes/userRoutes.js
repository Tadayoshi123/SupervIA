// backend/db-service/src/routes/userRoutes.js
const express = require('express');
const { getAllUsers, createUser, getUserByEmail } = require('../controllers/userController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Récupère la liste de tous les utilisateurs
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: La liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crée un nouvel utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données manquantes
 *       409:
 *         description: L'email existe déjà
 */
router.post('/users', createUser);

/**
 * @swagger
 * /api/users/email/{email}:
 *   get:
 *     summary: Récupère un utilisateur par son email
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: L'email de l'utilisateur
 *     responses:
 *       200:
 *         description: L'utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get('/users/email/:email', getUserByEmail);

// Définition du schéma pour la documentation (non utilisé directement dans le code)
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: L'identifiant unique de l'utilisateur.
 *         email:
 *           type: string
 *           description: L'adresse email de l'utilisateur.
 *         name:
 *           type: string
 *           description: Le nom de l'utilisateur.
 *         emailVerified:
 *           type: string
 *           format: date-time
 *           description: La date de vérification de l'email.
 *         image:
 *           type: string
 *           description: L'URL de l'image de profil.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: La date de création du compte.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: La date de la dernière mise à jour.
 */

module.exports = router;
