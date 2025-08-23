/**
 * Instance Prisma Client pour le db-service
 * 
 * Client ORM centralisé pour toutes les interactions avec PostgreSQL.
 * Utilisé par tous les controllers pour les opérations CRUD.
 * 
 * @author SupervIA Team
 */

// backend/db-service/src/controllers/prisma.js
const { PrismaClient } = require('@prisma/client');

/**
 * Instance globale du client Prisma
 * @type {PrismaClient}
 */
const prisma = new PrismaClient();

module.exports = prisma;
