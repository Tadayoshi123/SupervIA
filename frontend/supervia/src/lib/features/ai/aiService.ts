/**
 * Service d'intelligence artificielle SupervIA Frontend
 * 
 * Interface vers l'ai-service pour les fonctionnalités d'IA :
 * suggestions de widgets, détection d'anomalies, prédictions,
 * calcul de seuils automatiques et génération de contenu.
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

// src/lib/features/ai/aiService.ts
import axios from 'axios';

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:3005/api/ai';

/**
 * Crée les headers d'authentification pour les requêtes IA
 * @returns {Record<string, string>} Headers avec Authorization
 */
const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export type TimePoint = { ts: number; value: number };

/**
 * Demande des suggestions de widgets IA basées sur l'infrastructure
 * @param {string} [hostId] - ID de l'hôte pour suggestions contextuelles
 * @param {Array} [items] - Liste des items/métriques disponibles
 * @returns {Promise<Array>} Suggestions de widgets avec types et configurations
 */
const suggestWidgets = async (
  hostId?: string,
  items?: Array<{ itemid: string; name: string; key_: string; value_type: string; units: string; lastvalue?: string }>
) => {
  const res = await axios.post(
    `${AI_API_URL}/suggest/widgets`,
    { hostId, items },
    { headers: createAuthHeaders() }
  );
  return res.data as Array<{ type: string; title: string; hostId?: string; itemId?: string; config?: Record<string, unknown> }>;
};

/**
 * Calcule des seuils optimaux basés sur des valeurs historiques
 * @param {number[]} values - Valeurs historiques de la métrique
 * @returns {Promise<{warning: number, critical: number}>} Seuils calculés
 */
const thresholds = async (values: number[]) => {
  const res = await axios.post(`${AI_API_URL}/thresholds`, { values }, { headers: createAuthHeaders() });
  return res.data as { warning: number; critical: number };
};

/**
 * Détecte les anomalies dans une série temporelle
 * @param {TimePoint[]} series - Série de points temporels
 * @returns {Promise<{anomalies: TimePoint[]}>} Points détectés comme anormaux
 */
const anomaly = async (series: TimePoint[]) => {
  const res = await axios.post(`${AI_API_URL}/anomaly`, { series }, { headers: createAuthHeaders() });
  return res.data as { anomalies: TimePoint[] };
};

/**
 * Prédit les valeurs futures d'une série temporelle
 * @param {TimePoint[]} series - Série de points historiques
 * @param {number} [horizon=5] - Nombre de points à prédire
 * @returns {Promise<{slope: number, forecast: Array}>} Tendance et prévisions
 */
const predict = async (series: TimePoint[], horizon = 5) => {
  const res = await axios.post(`${AI_API_URL}/predict`, { series, horizon }, { headers: createAuthHeaders() });
  return res.data as { slope: number; forecast: Array<{ index: number; value: number }> };
};

const summarize = async (
  problemsCount = 0, 
  hostsOnline = 0, 
  hostsTotal = 0,
  problems: any[] = [],
  widgets: any[] = [],
  topMetrics: any[] = [],
  dashboardStats: any = {},
  timeRange = '1h'
) => {
  const res = await axios.post(`${AI_API_URL}/summarize`, { 
    problemsCount, 
    hostsOnline, 
    hostsTotal,
    problems,
    widgets,
    topMetrics,
    dashboardStats,
    timeRange
  }, { headers: createAuthHeaders() });
  return res.data as { text: string };
};

const generateTitle = async (type: string, items: Array<{ name: string }>) => {
  const res = await axios.post(`${AI_API_URL}/generate/title`, { type, items }, { headers: createAuthHeaders() });
  return res.data as { title: string };
};

const aiService = { suggestWidgets, thresholds, anomaly, predict, summarize, generateTitle };

export default aiService;


