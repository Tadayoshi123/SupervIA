/**
 * Utilitaires pour la gestion des alertes enrichies SupervIA
 * 
 * Ce module fournit des fonctions pour créer et envoyer des alertes contextualisées
 * avec des métadonnées avancées (tendances, durées, fréquences). Il remplace le
 * système d'alertes basique par un système intelligent qui analyse automatiquement
 * la sévérité et enrichit les notifications avec du contexte pertinent.
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

import notificationService, { SendAlertPayload } from '@/lib/features/notifications/notificationService';
import { Widget } from '@/types/dashboard';

export type AlertContext = {
  widget: Widget;
  hostName?: string;
  metricName?: string;
  currentValue: number | string;
  threshold: number | string;
  units?: string;
  condition?: string;
  previousValue?: number | string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  alertCount?: number;
  duration?: number; // en minutes
  additionalContext?: {
    trend?: string;
    duration?: string;
    previousValue?: string;
    frequency?: string;
  };
};

/**
 * Détermine automatiquement le niveau de sévérité basé sur une valeur numérique
 * 
 * @param value - Valeur actuelle de la métrique
 * @param warningThreshold - Seuil d'avertissement
 * @param criticalThreshold - Seuil critique
 * @returns Niveau de sévérité approprié
 */
export const getSeverityFromValue = (
  value: number,
  warningThreshold: number,
  criticalThreshold: number
): SendAlertPayload['severity'] => {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'high';
  return 'warning';
};

export const getSeverityFromStatus = (status: string): SendAlertPayload['severity'] => {
  switch (status.toLowerCase()) {
    case 'critical': return 'critical';
    case 'error': return 'high';
    case 'warning': return 'warning';
    case 'down': return 'critical';
    case 'up': return 'info';
    default: return 'warning';
  }
};

export const formatTrend = (trend?: 'increasing' | 'decreasing' | 'stable'): string | undefined => {
  switch (trend) {
    case 'increasing': return '📈 En hausse';
    case 'decreasing': return '📉 En baisse';
    case 'stable': return '➡️ Stable';
    default: return undefined;
  }
};

export const formatDuration = (minutes?: number): string | undefined => {
  if (!minutes || minutes <= 0) return undefined;
  
  if (minutes < 60) {
    return `Alerte active depuis ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `Alerte active depuis ${hours}h${remainingMinutes > 0 ? remainingMinutes.toString().padStart(2, '0') : ''}`;
  }
};

export const formatFrequency = (count?: number): string | undefined => {
  if (!count || count <= 1) return undefined;
  
  if (count === 2) return '2ème alerte récente';
  if (count === 3) return '3ème alerte en peu de temps';
  if (count >= 4) return `${count} alertes répétées - problème persistant`;
  
  return undefined;
};

export const getConditionText = (
  widgetType: string,
  operator?: string,
  threshold?: number | string
): string => {
  if (!threshold) return 'seuil dépassé';
  
  switch (widgetType) {
    case 'gauge':
      return `supérieur à ${threshold}`;
    case 'availability':
      return 'hôte indisponible';
    case 'problems':
      return `seuil de ${threshold} problème(s) atteint`;
    case 'metricValue':
      if (operator === '>') return `supérieur à ${threshold}`;
      if (operator === '<') return `inférieur à ${threshold}`;
      if (operator === '>=') return `supérieur ou égal à ${threshold}`;
      if (operator === '<=') return `inférieur ou égal à ${threshold}`;
      if (operator === '==') return `égal à ${threshold}`;
      if (operator === '!=') return `différent de ${threshold}`;
      return `condition ${operator || ''} ${threshold}`;
    default:
      return `seuil de ${threshold} dépassé`;
  }
};

export const sendEnrichedAlert = async (context: AlertContext): Promise<void> => {
  const {
    widget,
    hostName = 'Hôte inconnu',
    metricName = 'Métrique',
    currentValue,
    threshold,
    units = '',
    condition,
    previousValue,
    trend,
    alertCount,
    duration,
    additionalContext: providedContext
  } = context;

  // Déterminer la sévérité
  let severity: SendAlertPayload['severity'] = 'warning';
  
  if (widget.type === 'gauge') {
    const warn = (widget.config?.warningThreshold as number) || 70;
    const crit = (widget.config?.criticalThreshold as number) || 90;
    severity = getSeverityFromValue(Number(currentValue), warn, crit);
  } else if (widget.type === 'availability') {
    severity = Number(currentValue) === 0 ? 'critical' : 'info';
  } else if (widget.type === 'problems') {
    const problemCount = Number(currentValue);
    if (problemCount >= 5) severity = 'critical';
    else if (problemCount >= 3) severity = 'high';
    else if (problemCount >= 1) severity = 'medium';
  }

  // Construire le contexte additionnel
  const additionalContext: SendAlertPayload['additionalContext'] = { ...providedContext };
  
  if (trend && !additionalContext.trend) {
    const trendText = formatTrend(trend);
    if (trendText) additionalContext.trend = trendText;
  }
  
  if (duration && !additionalContext.duration) {
    const durationText = formatDuration(duration);
    if (durationText) additionalContext.duration = durationText;
  }
  
  if (previousValue !== undefined && !additionalContext.previousValue) {
    additionalContext.previousValue = String(previousValue);
  }
  
  if (alertCount && !additionalContext.frequency) {
    const frequencyText = formatFrequency(alertCount);
    if (frequencyText) additionalContext.frequency = frequencyText;
  }

  // Construire l'URL du dashboard
  const dashboardUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/dashboard-editor`
    : undefined;

  const alertPayload: SendAlertPayload = {
    alertType: widget.type as SendAlertPayload['alertType'],
    severity,
    widgetTitle: widget.title || 'Widget sans titre',
    hostName,
    metricName,
    currentValue: String(currentValue),
    threshold: String(threshold),
    units,
    condition: condition || getConditionText(widget.type, undefined, threshold),
    timestamp: new Date().toISOString(),
    dashboardUrl,
    additionalContext: Object.keys(additionalContext).length > 0 ? additionalContext : undefined
  };

  try {
    await notificationService.sendAlert(alertPayload);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'alerte enrichie:', error);
    // Fallback vers l'ancien système si nécessaire
    throw error;
  }
};

export default {
  sendEnrichedAlert,
  getSeverityFromValue,
  getSeverityFromStatus,
  formatTrend,
  formatDuration,
  formatFrequency,
  getConditionText
};
