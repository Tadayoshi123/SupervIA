// src/lib/features/metrics/metricsService.ts
import axios from 'axios';

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

// Configuration des en-têtes avec le token JWT
const createAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
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

const metricsService = {
  getHosts,
  getItemsForHost,
  getProblems,
};

export default metricsService;