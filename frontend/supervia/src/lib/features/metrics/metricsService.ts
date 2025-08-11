// src/lib/features/metrics/metricsService.ts
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const METRICS_API_URL = process.env.NEXT_PUBLIC_METRICS_API_URL || 'http://localhost:3003/api/metrics';

// Types pour les données Zabbix
export interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  available: string;
  active_available: string; // Ajout de ce champ qui est présent dans la réponse API
  description?: string;
  interfaces?: ZabbixInterface[];
}

export interface ZabbixInterface {
  interfaceid: string;
  hostid: string;
  main: string;
  type: string;
  useip: string;
  ip: string;
  dns: string;
  port: string;
}

export interface ZabbixItem {
  itemid: string;
  hostid: string;
  name: string;
  key_: string;
  type: string;
  value_type: string;
  units: string;
  status: string;
  state: string;
  lastvalue?: string;
  lastclock?: string;
}

export interface ZabbixProblem {
  eventid: string;
  objectid: string;
  name: string;
  severity: string;
  priority: string;
  clock: string;
  r_clock?: string;
  hosts: Array<{
    hostid: string;
    host: string;
    name: string;
  }>;
}

export interface HostsSummary {
  total: number;
  online: number;
  offline: number;
  updatedAt: string;
}

export interface ItemHistoryPoint {
  clock: string; // epoch seconds as string
  value: string; // numeric value as string
}

// Vérifie et gère un JWT expiré
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (!decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Configuration des en-têtes avec le token JWT
const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && isTokenExpired(token)) {
    // Nettoyage et redirection douce si le token est périmé
    localStorage.removeItem('token');
    if (typeof window !== 'undefined') {
      // éviter boucle infinie si on est déjà sur /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Service pour récupérer les hôtes Zabbix
const getHosts = async (): Promise<ZabbixHost[]> => {
  const response = await axios.get(`${METRICS_API_URL}/hosts`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

// Service pour récupérer les items d'un hôte spécifique
const getItemsForHost = async (hostid: string): Promise<ZabbixItem[]> => {
  const response = await axios.get(`${METRICS_API_URL}/items/${hostid}`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

// Service pour récupérer les problèmes actifs
const getProblems = async (): Promise<ZabbixProblem[]> => {
  const response = await axios.get(`${METRICS_API_URL}/problems`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

const getHostsSummary = async (): Promise<HostsSummary> => {
  const response = await axios.get(`${METRICS_API_URL}/hosts/summary`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

const getTopItems = async (hostid: string, limit = 5): Promise<ZabbixItem[]> => {
  const response = await axios.get(`${METRICS_API_URL}/items/${hostid}/top?limit=${limit}`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

const getItemHistory = async (itemid: string, from?: number, to?: number, limit?: number): Promise<ItemHistoryPoint[]> => {
  const qs = new URLSearchParams();
  if (from) qs.set('from', String(from));
  if (to) qs.set('to', String(to));
  if (limit) qs.set('limit', String(limit));
  const response = await axios.get(`${METRICS_API_URL}/history/${itemid}?${qs.toString()}`, {
    headers: createAuthHeaders(),
  });
  return response.data;
};

const metricsService = {
  getHosts,
  getItemsForHost,
  getProblems,
  getHostsSummary,
  getTopItems,
  getItemHistory,
};

export default metricsService;