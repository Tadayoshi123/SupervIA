/**
 * Service de gestion des dashboards SupervIA
 * 
 * Ce service utilise le BFF (Backend For Frontend) proxy de Next.js pour
 * sécuriser les appels vers le db-service sans exposer les clés API internes.
 * Il gère la création, modification, suppression et récupération des dashboards.
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

// src/lib/features/dashboard/dashboardService.ts
import axios from 'axios';

// BFF proxy Next.js pour éviter d'exposer la clé interne
const BFF_DB_API_URL = '/api/bff/db';

export type DashboardWidgetDto = {
  id?: number;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hostId?: string | null;
  itemId?: string | null;
  config?: Record<string, unknown> | null;
};

export type DashboardDto = {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  widgets: DashboardWidgetDto[];
};

/**
 * Crée les headers d'authentification avec le token JWT
 * @returns {Record<string, string>} Headers avec Authorization si token présent
 */
const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Crée un nouveau dashboard avec ses widgets
 * @param {string} name - Nom du dashboard
 * @param {number} userId - ID de l'utilisateur propriétaire
 * @param {DashboardWidgetDto[]} widgets - Liste des widgets à créer
 * @returns {Promise<DashboardDto>} Dashboard créé avec ID assigné
 */
async function createDashboard(name: string, userId: number, widgets: DashboardWidgetDto[]): Promise<DashboardDto> {
  const res = await axios.post(`${BFF_DB_API_URL}/dashboards`, { name, userId, widgets }, {
    headers: createAuthHeaders(),
  });
  return res.data;
}

/**
 * Récupère tous les dashboards d'un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @returns {Promise<DashboardDto[]>} Liste des dashboards
 */
async function listDashboards(userId: number): Promise<DashboardDto[]> {
  const res = await axios.get(`${BFF_DB_API_URL}/users/${userId}/dashboards`, {
    headers: createAuthHeaders(),
  });
  return res.data;
}

/**
 * Récupère un dashboard spécifique par son ID
 * @param {number} id - ID du dashboard
 * @returns {Promise<DashboardDto>} Dashboard avec ses widgets
 */
async function getDashboard(id: number): Promise<DashboardDto> {
  const res = await axios.get(`${BFF_DB_API_URL}/dashboards/${id}`, { headers: createAuthHeaders() });
  return res.data;
}

/**
 * Met à jour un dashboard existant
 * @param {number} id - ID du dashboard à modifier
 * @param {Object} payload - Données à mettre à jour
 * @param {string} [payload.name] - Nouveau nom du dashboard
 * @param {DashboardWidgetDto[]} [payload.widgets] - Nouveaux widgets
 * @returns {Promise<DashboardDto>} Dashboard mis à jour
 */
async function updateDashboard(id: number, payload: { name?: string; widgets?: DashboardWidgetDto[] }): Promise<DashboardDto> {
  const res = await axios.put(`${BFF_DB_API_URL}/dashboards/${id}`, payload, { headers: createAuthHeaders() });
  return res.data;
}

/**
 * Supprime un dashboard et tous ses widgets
 * @param {number} id - ID du dashboard à supprimer
 * @returns {Promise<void>} Confirmation de suppression
 */
async function deleteDashboard(id: number): Promise<void> {
  await axios.delete(`${BFF_DB_API_URL}/dashboards/${id}`, { headers: createAuthHeaders() });
}

const dashboardService = {
  createDashboard,
  listDashboards,
  getDashboard,
  updateDashboard,
  deleteDashboard,
};

export default dashboardService;


