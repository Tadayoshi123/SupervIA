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

const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function createDashboard(name: string, userId: number, widgets: DashboardWidgetDto[]): Promise<DashboardDto> {
  const res = await axios.post(`${BFF_DB_API_URL}/dashboards`, { name, userId, widgets }, {
    headers: createAuthHeaders(),
  });
  return res.data;
}

async function listDashboards(userId: number): Promise<DashboardDto[]> {
  const res = await axios.get(`${BFF_DB_API_URL}/users/${userId}/dashboards`, {
    headers: createAuthHeaders(),
  });
  return res.data;
}

async function getDashboard(id: number): Promise<DashboardDto> {
  const res = await axios.get(`${BFF_DB_API_URL}/dashboards/${id}`, { headers: createAuthHeaders() });
  return res.data;
}

async function updateDashboard(id: number, payload: { name?: string; widgets?: DashboardWidgetDto[] }): Promise<DashboardDto> {
  const res = await axios.put(`${BFF_DB_API_URL}/dashboards/${id}`, payload, { headers: createAuthHeaders() });
  return res.data;
}

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


