/**
 * Service de notifications SupervIA
 * 
 * Ce service gère l'envoi de notifications par email via le notification-service.
 * Il supporte deux types d'emails :
 * - Emails basiques (sendEmail) : Pour les notifications génériques
 * - Alertes enrichies (sendAlert) : Pour les alertes de supervision avec templates avancés
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

'use client';

import axios from 'axios';

const NOTIF_API_URL = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:3004';

const createAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  } as Record<string, string>;
};

export type SendEmailPayload = {
  to?: string; // optionnel: le backend utilisera NOTIF_DEFAULT_TO si absent
  subject: string;
  text: string;
  html?: string;
};

export type SendAlertPayload = {
  alertType: 'gauge' | 'multiChart' | 'availability' | 'problems' | 'metricValue';
  severity?: 'critical' | 'high' | 'medium' | 'warning' | 'info';
  widgetTitle: string;
  hostName: string;
  metricName: string;
  currentValue: string;
  threshold: string;
  units?: string;
  condition?: string;
  timestamp?: string;
  dashboardUrl?: string;
  additionalContext?: {
    trend?: string;
    duration?: string;
    previousValue?: string;
    frequency?: string;
  };
};

/**
 * Envoie un email basique via le notification-service
 * 
 * @param payload - Données de l'email (sujet, texte, HTML optionnel, destinataire optionnel)
 * @throws {Error} Si l'envoi échoue
 */
const sendEmail = async ({ to, subject, text, html }: SendEmailPayload) => {
  const url = `${NOTIF_API_URL}/api/notifications/email/send`;
  const payload: Record<string, unknown> = { subject, text };
  if (html) payload.html = html;
  if (to && to.trim().length > 0) payload.to = to.trim();

  await axios.post(url, payload, { headers: createAuthHeaders() });
};

/**
 * Envoie une alerte enrichie avec template HTML professionnel
 * 
 * Cette fonction utilise le nouvel endpoint d'alertes qui génère automatiquement
 * des emails avec design moderne, couleurs selon la sévérité, et contexte détaillé.
 * 
 * @param alertData - Données complètes de l'alerte (type, sévérité, métrique, contexte)
 * @throws {Error} Si l'envoi échoue
 */
const sendAlert = async (alertData: SendAlertPayload) => {
  const url = `${NOTIF_API_URL}/api/notifications/email/alert`;
  await axios.post(url, alertData, { headers: createAuthHeaders() });
};

const notificationService = { sendEmail, sendAlert };
export default notificationService;


