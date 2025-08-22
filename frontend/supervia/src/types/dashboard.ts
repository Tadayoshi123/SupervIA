// Types pour l'éditeur de dashboard

export type WidgetType =
  | 'problems' // problèmes
  | 'multiChart' // graphique multi-métriques
  | 'gauge' // jauge avec seuils
  | 'availability' // disponibilité UP/DOWN
  | 'metricValue'; // lecture de valeur simple

export type ChartType = 'area' | 'line' | 'bar';

export interface AlertRule {
  targetItemId?: string; // item concerné (multiChart) ou laissé vide pour single metric
  operator: '>' | '>=' | '<' | '<=';
  threshold: number;
  severity?: 'warning' | 'critical';
  durationSec?: number; // non-critique pour l'instant (UI)
}

export interface WidgetConfig {
  chartType?: ChartType;
  color?: string;
  // Multi‑métriques
  series?: string[]; // itemIds sélectionnés
  seriesColors?: Record<string, string>; // itemId -> couleur hex
  timeRangeSec?: number; // plage temporelle
  refreshSec?: number; // fréquence d'actualisation
  legend?: boolean;
  showGrid?: boolean;
  // Prévision (overlay)
  forecastPoints?: Array<{ ts: number; value: number }>; // ts en secondes epoch ou ms: géré côté rendu
  showForecast?: boolean; // afficher/masquer la prévision côté rendu
  forecastColor?: string; // couleur du tracé de prévision
  // Filtres (retirés de l'UI)
  yMin?: number;
  yMax?: number;
  // Jauge
  warningThreshold?: number; // seuil d'avertissement
  criticalThreshold?: number; // seuil critique
  // Alertes génériques
  alerts?: AlertRule[];
  // Alertes par type (simplifiées à la Grafana)
  // Disponibilité
  alertOnDown?: boolean; // alerter quand l'hôte devient indisponible
  alertOnUp?: boolean; // alerter quand l'hôte redevient disponible
  // Jauge
  notifyOnGauge?: boolean; // utiliser les seuils de jauge pour notifier
  gaugeNotifyLevel?: 'warning' | 'critical'; // niveau minimal à notifier
  // Anti‑spam
  cooldownSec?: number; // délai minimum entre deux notifications identiques
  // Mono et multi métriques
  notifyOnSingle?: boolean; // mono‑métrique (metricValue)
  notifyOnMulti?: boolean; // multiChart: notifier quand une règle est vraie
  // Problèmes
  notifyOnProblems?: boolean; // notifier quand le nombre de problèmes dépasse un seuil
  problemsThreshold?: number; // nombre minimal de problèmes
  problemsMinSeverity?: '0' | '1' | '2' | '3' | '4' | '5'; // filtre de sévérité minimale
  problemsHostOnly?: boolean; // si true, filtrer par hostId du widget
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hostId?: string;
  itemId?: string;
  config?: WidgetConfig;
}

export interface DashboardConfig {
  id?: string;
  name: string;
  widgets: Widget[];
  createdAt?: string;
  updatedAt?: string;
}