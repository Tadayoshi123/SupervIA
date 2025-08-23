/**
 * Contrôleurs IA pour SupervIA
 * 
 * Ce module contient tous les contrôleurs pour les fonctionnalités d'intelligence artificielle :
 * - Suggestions de widgets intelligentes
 * - Calcul de seuils automatiques
 * - Détection d'anomalies statistiques
 * - Prévisions par régression linéaire
 * - Résumés contextuels avec LLM
 * - Génération de titres de widgets
 * 
 * @author SupervIA Team
 */

const logger = require('../logger');

/**
 * Calcule la moyenne d'un tableau de valeurs numériques
 * @param {number[]} values - Tableau de valeurs numériques
 * @returns {number} Moyenne des valeurs, 0 si tableau vide
 */
function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
/**
 * Calcule l'écart-type d'un tableau de valeurs numériques
 * @param {number[]} values - Tableau de valeurs numériques
 * @returns {number} Écart-type des valeurs
 */
function stddev(values) {
  const m = mean(values);
  const variance = mean(values.map(v => (v - m) ** 2));
  return Math.sqrt(variance);
}
/**
 * Calcule le percentile d'un tableau de valeurs numériques
 * @param {number[]} values - Tableau de valeurs numériques
 * @param {number} p - Percentile à calculer (0-100)
 * @returns {number} Valeur du percentile demandé
 */
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

/**
 * Génère des suggestions de widgets intelligentes basées sur les métriques d'un hôte
 * 
 * Analyse les items Zabbix fournis et propose des widgets optimaux selon des heuristiques :
 * - MultiChart pour vue d'ensemble (CPU, mémoire, disque)
 * - Gauge pour métriques en pourcentage
 * - Availability pour ping/disponibilité
 * - MetricValue pour autres métriques importantes
 * 
 * @param {import('express').Request} req - Requête avec body.{hostId, items[]}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Suggestions de widgets avec configuration
 */
async function suggestWidgets(req, res, next) {
  try {
    const { hostId, items = [] } = req.body || {};

    // items attendus (facultatif): [{ itemid, name, key_, value_type, units, lastvalue }]
    const asNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const isNumeric = (it) => it && (it.value_type === '0' || it.value_type === '3');
    const prefersPercent = (it) => (it?.units || '').includes('%');
    const matches = (name, substr) => (name || '').toLowerCase().includes(substr);

    const numericItems = items.filter(isNumeric);
    const sortedByValueDesc = [...numericItems].sort((a, b) => asNumber(b.lastvalue) - asNumber(a.lastvalue));

    // Heuristiques de sélection
    const cpuItem = sortedByValueDesc.find((it) => prefersPercent(it) || matches(it.name, 'cpu') || matches(it.name, 'util')); // utilisation CPU/percent
    const memItem = sortedByValueDesc.find((it) => matches(it.name, 'mem') || matches(it.name, 'memory'));
    const diskItem = sortedByValueDesc.find((it) => matches(it.name, 'disk') || matches(it.name, 'i/o') || matches(it.name, 'io'));

    const availabilityItem = (items || []).find((it) => matches(it.key_, 'icmpping') || matches(it.key_, 'agent.ping') || matches(it.key_, 'availability'));

    // Suggestions dynamiques par type
    const suggestions = [];

    // 1) MultiChart: jusqu'à 3 métriques pertinentes
    const multiSeries = [cpuItem, memItem, diskItem, ...sortedByValueDesc].filter(Boolean)
      .filter((it, idx, arr) => arr.findIndex((x) => x.itemid === it.itemid) === idx)
      .slice(0, 3)
      .map((it) => it.itemid);
    if (multiSeries.length >= 2) {
      const title = `Comparatif: ${multiSeries.length} métriques`;
      suggestions.push({
        type: 'multiChart',
        title,
        hostId,
        config: { chartType: 'area', legend: true, showGrid: true, series: multiSeries }
      });
    }

    // 2) Gauge: privilégie un pourcentage élevé (CPU, utilisation, etc.)
    const gaugeItem = cpuItem || sortedByValueDesc[0];
    if (gaugeItem) {
      suggestions.push({
        type: 'gauge',
        title: `Jauge: ${gaugeItem.name || 'Métrique'}`,
        hostId,
        itemId: gaugeItem.itemid,
        config: { warningThreshold: 70, criticalThreshold: 90 }
      });
    }

    // 3) Disponibilité
    if (availabilityItem) {
      suggestions.push({
        type: 'availability',
        title: 'Disponibilité hôte',
        hostId,
        itemId: availabilityItem.itemid,
        config: {}
      });
    }

    // 4) Valeur simple: choisit une autre métrique non utilisée
    const used = new Set([
      ...multiSeries,
      ...(gaugeItem ? [gaugeItem.itemid] : []),
      ...(availabilityItem ? [availabilityItem.itemid] : []),
    ]);
    const valueItem = sortedByValueDesc.find((it) => !used.has(it.itemid));
    if (valueItem) {
      suggestions.push({
        type: 'metricValue',
        title: valueItem.name || 'Valeur',
        hostId,
        itemId: valueItem.itemid,
        config: {}
      });
    }

    // Fallback si rien
    if (suggestions.length === 0) {
      suggestions.push({ type: 'multiChart', title: 'Comparatif de métriques', hostId, config: { chartType: 'area', series: [] } });
    }

    res.json(suggestions);
  } catch (err) {
    next(err);
  }
}

/**
 * Calcule des seuils d'alerte automatiques basés sur l'historique des données
 * 
 * Utilise les percentiles 80 et 95 pour déterminer des seuils warning et critical
 * adaptés aux valeurs historiques de la métrique.
 * 
 * @param {import('express').Request} req - Requête avec body.values (array de nombres)
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Seuils warning et critical calculés
 */
async function thresholds(req, res, next) {
  try {
    const { values } = req.body; // tableau de valeurs numériques
    const warn = percentile(values, 80);
    const crit = percentile(values, 95);
    res.json({ warning: warn, critical: crit });
  } catch (err) { next(err); }
}

/**
 * Détecte les anomalies dans une série temporelle de données
 * 
 * Utilise la méthode du z-score avec un seuil de 3 écarts-types (99.7% de confiance).
 * Les points avec |z-score| > 3 sont considérés comme des anomalies.
 * 
 * @param {import('express').Request} req - Requête avec body.series [{ts, value}]
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Liste des points détectés comme anomalies
 */
async function anomaly(req, res, next) {
  try {
    const { series } = req.body; // [{ts,value}]
    const vals = series.map(p => Number(p.value || 0));
    const m = mean(vals); const s = stddev(vals) || 1;
    const anomalies = series.filter(p => Math.abs((p.value - m) / s) > 3);
    res.json({ anomalies });
  } catch (err) { next(err); }
}

/**
 * Génère des prévisions basées sur une régression linéaire simple (OLS)
 * 
 * Calcule la tendance linéaire des données historiques et projette les valeurs futures
 * sur l'horizon demandé. Utilise la méthode des moindres carrés ordinaires.
 * 
 * @param {import('express').Request} req - Requête avec body.{series, horizon}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Pente et prévisions sur l'horizon demandé
 */
async function predict(req, res, next) {
  try {
    const { series, horizon = 5 } = req.body; // OLS simple
    const xs = series.map((_, i) => i);
    const ys = series.map(p => Number(p.value || 0));
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const forecast = Array.from({ length: horizon }).map((_, k) => ({ index: n + k, value: intercept + slope * (n + k) }));
    res.json({ slope, forecast });
  } catch (err) { next(err); }
}

const { callChatLLM } = require('./llmClient');

/**
 * Génère un résumé intelligent de l'état de l'infrastructure
 * 
 * Combine analyse locale et IA (OpenAI) pour créer des résumés contextuels.
 * Analyse les problèmes, métriques critiques, widgets actifs et génère un texte
 * professionnel et actionnable. Fallback local si OpenAI indisponible.
 * 
 * @param {import('express').Request} req - Requête avec contexte infrastructure
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Résumé textuel de l'état système
 */
async function summarize(req, res, next) {
  try {
    const { 
      problemsCount = 0, 
      hostsOnline = 0, 
      hostsTotal = 0,
      problems = [],
      widgets = [],
      topMetrics = [],
      dashboardStats = {},
      timeRange = '1h'
    } = req.body || {};
    
    // Fallback local enrichi
    let text = `Infrastructure: ${hostsOnline}/${hostsTotal} hôtes en ligne, ${problemsCount} problème(s) détecté(s).`;
    
    try {
      // Analyser les problèmes par sévérité
      const criticalProblems = problems.filter(p => Number(p.severity) >= 4).length;
      const highProblems = problems.filter(p => Number(p.severity) >= 3).length;
      const mediumProblems = problems.filter(p => Number(p.severity) >= 2).length;
      
      // Analyser les widgets actifs
      const widgetTypes = widgets.reduce((acc, w) => {
        acc[w.type] = (acc[w.type] || 0) + 1;
        return acc;
      }, {});
      
      // Analyser les métriques critiques
      const criticalMetrics = topMetrics.filter(m => {
        const value = Number(m.value);
        return (m.units?.includes('%') && value > 90) || 
               (m.name?.toLowerCase().includes('cpu') && value > 80) ||
               (m.name?.toLowerCase().includes('memory') && value > 85);
      });
      
      // Construire un contexte riche pour l'IA
      const system = `Tu es un expert en supervision d'infrastructure. Analyse l'état actuel et donne un résumé concis, actionnable et varié. 
Utilise un ton professionnel mais accessible. Évite les répétitions et adapte ton analyse selon le contexte.
Focus sur les points critiques et les recommandations pratiques.`;

      const contextParts = [
        `Infrastructure: ${hostsOnline}/${hostsTotal} hôtes actifs`,
        problemsCount > 0 ? `Alertes: ${criticalProblems} critiques, ${highProblems} élevées, ${mediumProblems} moyennes` : 'Aucune alerte active',
        widgets.length > 0 ? `Dashboard: ${widgets.length} widgets (${Object.entries(widgetTypes).map(([type, count]) => `${count} ${type}`).join(', ')})` : 'Dashboard vide',
        criticalMetrics.length > 0 ? `Métriques critiques: ${criticalMetrics.map(m => `${m.name}: ${m.value}${m.units || ''}`).slice(0, 3).join(', ')}` : 'Métriques dans les seuils normaux',
        `Période analysée: ${timeRange}`
      ];
      
      const user = `Analyse cette infrastructure et donne un résumé en 2-3 phrases maximum :\n${contextParts.join('\n')}`;
      
      const out = await callChatLLM({ system, user, temperature: 0.4 });
      if (out.text) text = out.text.trim();
    } catch (e) {
      logger.warn('Fallback vers résumé local pour summarize:', e.message);
    }
    
    res.json({ text });
  } catch (err) { next(err); }
}

/**
 * Génère un titre intelligent pour un widget de dashboard
 * 
 * Utilise l'IA (OpenAI) pour créer des titres courts et descriptifs basés sur
 * le type de widget et les métriques associées. Fallback vers titres génériques
 * si l'IA n'est pas disponible.
 * 
 * @param {import('express').Request} req - Requête avec type et items du widget
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant
 * @returns {Promise<void>} Titre généré pour le widget
 */
async function generateTitle(req, res, next) {
  try {
    const { type, items = [] } = req.body || {};
    const base = type === 'multiChart' ? 'Comparatif de métriques' : type === 'gauge' ? 'Jauge' : type === 'availability' ? 'Disponibilité' : 'Valeur de métrique';
    let title = `${base}`;
    try {
      const itemNames = items.slice(0, 3).map(i => i?.name).filter(Boolean).join(', ');
      const system = 'Tu proposes un titre court et clair pour un widget de dashboard (français).';
      const user = `Type: ${type}. Items: ${itemNames}. Donne un titre court sans ponctuation excessive.`;
      const out = await callChatLLM({ system, user, temperature: 0.4 });
      if (out.text) title = out.text.replace(/\n/g, ' ').trim();
    } catch {}
    res.json({ title });
  } catch (err) { next(err); }
}

module.exports = { suggestWidgets, thresholds, anomaly, predict, summarize, generateTitle };


