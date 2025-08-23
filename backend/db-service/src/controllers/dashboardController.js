// backend/db-service/src/controllers/dashboardController.js
const prisma = require('./prisma');

/**
 * Crée un nouveau dashboard avec ses widgets associés
 * @param {import('express').Request} req - Requête avec { name, widgets, userId }
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Dashboard créé avec ses widgets
 */
async function createDashboard(req, res, next) {
  try {
    const { name, widgets, userId } = req.body;
    if (!name || !Array.isArray(widgets) || !userId) {
      return res.status(400).json({ message: 'name, userId et widgets sont requis' });
    }
    const created = await prisma.dashboard.create({
      data: {
        name,
        userId: Number(userId),
        widgets: {
          create: widgets.map((w) => ({
            type: String(w.type),
            title: String(w.title || ''),
            x: Number(w.x || 0),
            y: Number(w.y || 0),
            width: Number(w.width || 3),
            height: Number(w.height || 3),
            hostId: w.hostId ? String(w.hostId) : null,
            itemId: w.itemId ? String(w.itemId) : null,
            config: w.config || null,
          })),
        },
      },
      include: { widgets: true },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * Liste tous les dashboards d'un utilisateur donné
 * @param {import('express').Request} req - Requête avec params.userId
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Liste des dashboards avec widgets
 */
async function listDashboards(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const dashboards = await prisma.dashboard.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { widgets: true },
    });
    res.json(dashboards);
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère un dashboard spécifique par son ID
 * @param {import('express').Request} req - Requête avec params.id
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Dashboard avec ses widgets ou 404
 */
async function getDashboard(req, res, next) {
  try {
    const id = Number(req.params.id);
    const dash = await prisma.dashboard.findUnique({ where: { id }, include: { widgets: true } });
    if (!dash) return res.status(404).json({ message: 'Dashboard introuvable' });
    res.json(dash);
  } catch (err) {
    next(err);
  }
}

/**
 * Met à jour un dashboard existant (nom et/ou widgets)
 * Remplace complètement les widgets si fournis dans la requête
 * @param {import('express').Request} req - Requête avec params.id et body.{name?, widgets?}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Dashboard mis à jour avec widgets
 */
async function updateDashboard(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, widgets } = req.body;
    const existing = await prisma.dashboard.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Dashboard introuvable' });
    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(widgets)) {
        await tx.dashboardWidget.deleteMany({ where: { dashboardId: id } });
        await tx.dashboardWidget.createMany({
          data: widgets.map((w) => ({
            dashboardId: id,
            type: String(w.type),
            title: String(w.title || ''),
            x: Number(w.x || 0),
            y: Number(w.y || 0),
            width: Number(w.width || 3),
            height: Number(w.height || 3),
            hostId: w.hostId ? String(w.hostId) : null,
            itemId: w.itemId ? String(w.itemId) : null,
            config: w.config || null,
          })),
        });
      }
      return tx.dashboard.update({
        where: { id },
        data: { name: name ?? existing.name },
        include: { widgets: true },
      });
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * Supprime un dashboard et tous ses widgets associés
 * @param {import('express').Request} req - Requête avec params.id
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Statut 204 en cas de succès
 */
async function deleteDashboard(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.dashboard.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDashboard,
  listDashboards,
  getDashboard,
  updateDashboard,
  deleteDashboard,
};


