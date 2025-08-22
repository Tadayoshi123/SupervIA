// src/lib/features/ai/aiService.ts
import axios from 'axios';

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:3005/api/ai';

const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export type TimePoint = { ts: number; value: number };

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

const thresholds = async (values: number[]) => {
  const res = await axios.post(`${AI_API_URL}/thresholds`, { values }, { headers: createAuthHeaders() });
  return res.data as { warning: number; critical: number };
};

const anomaly = async (series: TimePoint[]) => {
  const res = await axios.post(`${AI_API_URL}/anomaly`, { series }, { headers: createAuthHeaders() });
  return res.data as { anomalies: TimePoint[] };
};

const predict = async (series: TimePoint[], horizon = 5) => {
  const res = await axios.post(`${AI_API_URL}/predict`, { series, horizon }, { headers: createAuthHeaders() });
  return res.data as { slope: number; forecast: Array<{ index: number; value: number }> };
};

const summarize = async (problemsCount = 0, hostsOnline = 0, hostsTotal = 0) => {
  const res = await axios.post(`${AI_API_URL}/summarize`, { problemsCount, hostsOnline, hostsTotal }, { headers: createAuthHeaders() });
  return res.data as { text: string };
};

const generateTitle = async (type: string, items: Array<{ name: string }>) => {
  const res = await axios.post(`${AI_API_URL}/generate/title`, { type, items }, { headers: createAuthHeaders() });
  return res.data as { title: string };
};

const aiService = { suggestWidgets, thresholds, anomaly, predict, summarize, generateTitle };

export default aiService;


