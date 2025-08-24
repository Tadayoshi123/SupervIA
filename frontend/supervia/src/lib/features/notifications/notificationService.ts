/**
 * Service de notifications SupervIA
 * 
 * Ce service gère l'envoi de notifications par email via le notification-service.
 * Il supporte plusieurs types d'envois :
 * - Emails basiques (sendEmail) : Pour les notifications génériques
 * - Alertes enrichies directes (sendAlert) : Pour envoi immédiat individuel
 * - Alertes par batch (sendBatchAlert) : Pour regroupement intelligent (RECOMMANDÉ)
 * - Administration (flushAlertBatch) : Pour forcer l'envoi du batch
 * 
 * **Nouvelles fonctionnalités v1.2.0 :**
 * - 🎯 Système de batch pour éviter le spam d'emails
 * - 📧 Templates HTML enrichis pour alertes groupées  
 * - ⏱️ Collecte automatique sur 30 secondes
 * - 📊 Regroupement par sévérité et hôte
 * - 🔄 Fallback automatique en cas d'erreur
 * 
 * @author SupervIA Team
 * @version 1.2.0
 * @since 1.0.0
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
 * Envoie une alerte enrichie avec template HTML professionnel (méthode directe)
 * 
 * Cette fonction utilise l'endpoint d'alertes directes qui envoie immédiatement
 * un email individuel pour chaque alerte.
 * 
 * @param alertData - Données complètes de l'alerte (type, sévérité, métrique, contexte)
 * @throws {Error} Si l'envoi échoue
 */
const sendAlert = async (alertData: SendAlertPayload) => {
  const url = `${NOTIF_API_URL}/api/notifications/email/alert`;
  await axios.post(url, alertData, { headers: createAuthHeaders() });
};

/**
 * Ajoute une alerte au système de batch pour envoi groupé (MÉTHODE RECOMMANDÉE)
 * 
 * Cette fonction ajoute l'alerte au service de batch qui collecte les alertes
 * pendant 30 secondes avant d'envoyer un seul email récapitulatif. Cela évite
 * le spam d'emails individuels tout en conservant les notifications temps-réel
 * dans l'interface utilisateur.
 * 
 * @param alertData - Données complètes de l'alerte (type, sévérité, métrique, contexte)
 * @returns Promise avec les informations du batch (nombre d'alertes, durée)
 * @throws {Error} Si l'ajout au batch échoue
 */
const sendBatchAlert = async (alertData: SendAlertPayload): Promise<{ alertsInBatch: number; batchDuration: number }> => {
  const url = `${NOTIF_API_URL}/api/notifications/batch/alert`;
  const response = await axios.post(url, alertData, { headers: createAuthHeaders() });
  return response.data.batchInfo;
};

/**
 * Force l'envoi immédiat du batch d'alertes (pour tests/admin)
 * 
 * Cette fonction force le traitement immédiat de toutes les alertes en attente
 * dans le batch, sans attendre la fin du timer de 30 secondes.
 * 
 * @throws {Error} Si le flush échoue
 */
const flushAlertBatch = async (): Promise<void> => {
  const url = `${NOTIF_API_URL}/api/notifications/batch/flush`;
  await axios.post(url, {}, { headers: createAuthHeaders() });
};

const notificationService = { sendEmail, sendAlert, sendBatchAlert, flushAlertBatch };
export default notificationService;


