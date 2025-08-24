/**
 * Service de regroupement des alertes pour envoi par batch
 * 
 * Ce service collecte les alertes pendant une période donnée (30 secondes par défaut)
 * et les envoie en un seul email récapitulatif pour éviter le spam d'emails.
 * Les alertes sont regroupées par niveau de criticité et par hôte.
 * 
 * Fonctionnalités principales :
 * - Collecte automatique des alertes pendant ALERT_BATCH_DURATION
 * - Regroupement intelligent par sévérité (critical > high > medium > warning > info)
 * - Template HTML responsive avec statistiques et détails
 * - Timer automatique avec traitement en arrière-plan
 * - Gestion robuste des erreurs avec logging détaillé
 * 
 * @author SupervIA Team
 * @since 1.2.0
 * @example
 * // Utilisation basique
 * const alertBatchService = require('./alertBatchService');
 * alertBatchService.addAlert({
 *   alertType: 'metricValue',
 *   severity: 'warning',
 *   widgetTitle: 'CPU Usage',
 *   hostName: 'Web Server',
 *   metricName: 'CPU utilization',
 *   currentValue: '85',
 *   threshold: '80',
 *   units: '%'
 * });
 */

const logger = require('../config/logger');
const { sendEmail } = require('./emailService');

/**
 * Classe principale du service de batch d'alertes
 * 
 * Cette classe implémente le pattern Singleton pour garantir une instance unique
 * du service de batch à travers toute l'application. Elle gère automatiquement
 * la collecte, le regroupement et l'envoi des alertes.
 * 
 * @class AlertBatchService
 */
class AlertBatchService {
  /**
   * Constructeur du service de batch d'alertes
   * 
   * Initialise les propriétés de l'instance avec des valeurs par défaut.
   * La durée du batch peut être configurée via la variable d'environnement
   * ALERT_BATCH_DURATION (en millisecondes).
   * 
   * @memberof AlertBatchService
   */
  constructor() {
    /** @type {Array<Object>} Tableau des alertes en attente dans le batch courant */
    this.alerts = [];
    
    /** @type {NodeJS.Timeout|null} Timer pour le traitement automatique du batch */
    this.timer = null;
    
    /** @type {number} Durée du batch en millisecondes (défaut: 30000ms = 30s) */
    this.batchDuration = process.env.ALERT_BATCH_DURATION || 30000;
    
    /** @type {boolean} Indicateur de traitement en cours pour éviter les conflits */
    this.isProcessing = false;
  }

  /**
   * Ajoute une alerte au batch courant
   * 
   * @param {Object} alertData - Données de l'alerte
   * @param {string} alertData.alertType - Type de widget
   * @param {string} alertData.severity - Niveau de sévérité
   * @param {string} alertData.widgetTitle - Titre du widget
   * @param {string} alertData.hostName - Nom de l'hôte
   * @param {string} alertData.metricName - Nom de la métrique
   * @param {string|number} alertData.currentValue - Valeur actuelle
   * @param {string|number} alertData.threshold - Seuil
   * @param {string} alertData.units - Unités
   * @param {string} alertData.condition - Condition de déclenchement
   * @param {Object} alertData.additionalContext - Contexte additionnel
   */
  addAlert(alertData) {
    const alert = {
      ...alertData,
      timestamp: new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.alerts.push(alert);
    logger.info(`Alerte ajoutée au batch: ${alert.widgetTitle} - ${alert.hostName} (${this.alerts.length} alertes en attente)`);

    // Démarrer le timer si ce n'est pas déjà fait
    if (!this.timer && !this.isProcessing) {
      this.startBatchTimer();
    }
  }

  /**
   * Démarre le timer de regroupement des alertes
   * 
   * Lance un timer qui déclenchera automatiquement le traitement du batch
   * après la durée configurée (batchDuration). Le timer n'est démarré que
   * si aucun autre timer n'est en cours et qu'aucun traitement n'est actif.
   * 
   * @memberof AlertBatchService
   * @private
   */
  startBatchTimer() {
    logger.info(`Démarrage du timer de batch d'alertes (${this.batchDuration}ms)`);
    
    this.timer = setTimeout(() => {
      this.processBatch();
    }, this.batchDuration);
  }

  /**
   * Traite le batch d'alertes et envoie l'email récapitulatif
   * 
   * Cette méthode est appelée automatiquement par le timer ou manuellement
   * via flushBatch(). Elle gère le traitement complet du batch :
   * - Vérification qu'il y a des alertes à traiter
   * - Génération et envoi de l'email récapitulatif
   * - Gestion des erreurs avec logging approprié
   * - Remise à zéro du batch
   * 
   * @memberof AlertBatchService
   * @async
   * @private
   */
  async processBatch() {
    if (this.alerts.length === 0) {
      this.resetBatch();
      return;
    }

    this.isProcessing = true;
    logger.info(`Traitement du batch de ${this.alerts.length} alerte(s)`);

    try {
      await this.sendBatchEmail();
      logger.info(`Email de batch envoyé avec succès pour ${this.alerts.length} alerte(s)`);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du batch d\'alertes:', error);
    } finally {
      this.resetBatch();
    }
  }

  /**
   * Remet à zéro le batch
   * 
   * Réinitialise toutes les propriétés du batch à leur état initial :
   * - Vide le tableau des alertes
   * - Supprime le timer en cours
   * - Remet l'indicateur de traitement à false
   * 
   * @memberof AlertBatchService
   * @private
   */
  resetBatch() {
    this.alerts = [];
    this.timer = null;
    this.isProcessing = false;
    logger.debug('Batch d\'alertes réinitialisé');
  }

  /**
   * Groupe les alertes par criticité et par hôte
   * 
   * @returns {Object} Alertes groupées
   */
  groupAlerts() {
    const severityOrder = { critical: 0, high: 1, medium: 2, warning: 3, info: 4 };
    
    // Grouper par criticité
    const bySeverity = this.alerts.reduce((acc, alert) => {
      const severity = alert.severity || 'warning';
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(alert);
      return acc;
    }, {});

    // Trier les alertes dans chaque groupe par hôte
    Object.keys(bySeverity).forEach(severity => {
      bySeverity[severity].sort((a, b) => a.hostName.localeCompare(b.hostName));
    });

    // Trier les groupes par ordre de criticité
    const sortedGroups = Object.keys(bySeverity)
      .sort((a, b) => (severityOrder[a] || 99) - (severityOrder[b] || 99))
      .reduce((acc, severity) => {
        acc[severity] = bySeverity[severity];
        return acc;
      }, {});

    return sortedGroups;
  }

  /**
   * Détermine les informations de sévérité pour l'affichage
   */
  getSeverityInfo(severity) {
    switch (severity.toLowerCase()) {
      case 'critical': return { icon: '🚨', color: '#dc2626', label: 'CRITIQUE', bgColor: '#fef2f2' };
      case 'high': return { icon: '⚠️', color: '#ea580c', label: 'ÉLEVÉE', bgColor: '#fff7ed' };
      case 'medium': return { icon: '⚡', color: '#d97706', label: 'MOYENNE', bgColor: '#fffbeb' };
      case 'warning': return { icon: '⚠️', color: '#ca8a04', label: 'ATTENTION', bgColor: '#fefce8' };
      case 'info': return { icon: 'ℹ️', color: '#2563eb', label: 'INFO', bgColor: '#eff6ff' };
      default: return { icon: '⚠️', color: '#6b7280', label: 'ALERTE', bgColor: '#f9fafb' };
    }
  }

  /**
   * Envoie l'email récapitulatif du batch d'alertes
   */
  async sendBatchEmail() {
    const defaultTo = process.env.NOTIF_DEFAULT_TO;
    if (!defaultTo) {
      throw new Error('NOTIF_DEFAULT_TO non configuré');
    }

    const groupedAlerts = this.groupAlerts();
    const alertCount = this.alerts.length;
    const hostCount = new Set(this.alerts.map(a => a.hostName)).size;
    const criticalCount = (groupedAlerts.critical || []).length;
    const highCount = (groupedAlerts.high || []).length;

    // Déterminer la sévérité globale du batch
    const globalSeverity = criticalCount > 0 ? 'critical' : 
                          highCount > 0 ? 'high' : 
                          (groupedAlerts.medium || []).length > 0 ? 'medium' : 'warning';
    
    const globalSeverityInfo = this.getSeverityInfo(globalSeverity);

    const subject = `${globalSeverityInfo.icon} [RAPPORT D'ALERTES] ${alertCount} alerte${alertCount > 1 ? 's' : ''} sur ${hostCount} hôte${hostCount > 1 ? 's' : ''}`;

    // Version texte
    const textParts = [
      `RAPPORT D'ALERTES SUPERVIA - ${alertCount} ALERTE${alertCount > 1 ? 'S' : ''}`,
      '',
      `📊 Résumé: ${alertCount} alerte${alertCount > 1 ? 's' : ''} sur ${hostCount} hôte${hostCount > 1 ? 's' : ''}`,
      `🚨 Critiques: ${criticalCount}`,
      `⚠️  Élevées: ${highCount}`,
      `⚡ Moyennes: ${(groupedAlerts.medium || []).length}`,
      `🔔 Attention: ${(groupedAlerts.warning || []).length}`,
      ''
    ];

    Object.entries(groupedAlerts).forEach(([severity, alerts]) => {
      const severityInfo = this.getSeverityInfo(severity);
      textParts.push(`=== ${severityInfo.icon} ${severityInfo.label} (${alerts.length}) ===`);
      
      alerts.forEach(alert => {
        textParts.push(`🖥️  ${alert.hostName} - ${alert.widgetTitle}`);
        textParts.push(`📈 ${alert.metricName}: ${alert.currentValue}${alert.units}`);
        textParts.push(`🎯 Seuil: ${alert.condition || `dépassé ${alert.threshold}${alert.units}`}`);
        textParts.push(`🕐 ${alert.timestamp.toLocaleString('fr-FR')}`);
        textParts.push('');
      });
      textParts.push('');
    });

    textParts.push('---');
    textParts.push('Ce rapport a été généré automatiquement par SupervIA.');

    const text = textParts.join('\n');

    // Version HTML
    const alertSections = Object.entries(groupedAlerts).map(([severity, alerts]) => {
      const severityInfo = this.getSeverityInfo(severity);
      
      const alertCards = alerts.map(alert => `
        <div style="background: white; border-left: 4px solid ${severityInfo.color}; padding: 16px; margin: 8px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${alert.widgetTitle}</div>
              <div style="color: #6b7280; font-size: 14px;">🖥️ ${alert.hostName}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #6b7280;">
              ${alert.timestamp.toLocaleString('fr-FR')}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">📈 Métrique</div>
              <div style="font-weight: 500; color: #1f2937;">${alert.metricName}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">⚡ Valeur</div>
              <div style="font-weight: 600; color: ${severityInfo.color}; font-size: 16px;">${alert.currentValue}${alert.units}</div>
            </div>
            <div style="grid-column: 1 / -1;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">🎯 Condition</div>
              <div style="font-weight: 500; color: #1f2937;">${alert.condition || `dépassé ${alert.threshold}${alert.units}`}</div>
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div style="margin: 24px 0;">
          <div style="background: ${severityInfo.bgColor}; border: 1px solid ${severityInfo.color}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0; color: ${severityInfo.color}; font-size: 18px;">
              ${severityInfo.icon} ${severityInfo.label} (${alerts.length} alerte${alerts.length > 1 ? 's' : ''})
            </h3>
          </div>
          ${alertCards}
        </div>
      `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport d'Alertes SupervIA</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, ${globalSeverityInfo.color}, ${globalSeverityInfo.color}dd); color: white; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .summary { background: #f8fafc; padding: 24px; border-bottom: 1px solid #e5e7eb; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; margin-top: 16px; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 24px; font-weight: 700; color: #1f2937; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 24px; }
    .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${globalSeverityInfo.icon} Rapport d'Alertes SupervIA</h1>
      <div style="margin-top: 8px; font-size: 16px; opacity: 0.9;">
        ${alertCount} alerte${alertCount > 1 ? 's' : ''} détectée${alertCount > 1 ? 's' : ''} sur ${hostCount} hôte${hostCount > 1 ? 's' : ''}
      </div>
    </div>
    
    <div class="summary">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">📊 Résumé des alertes</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value" style="color: #dc2626;">${criticalCount}</div>
          <div class="summary-label">🚨 Critiques</div>
        </div>
        <div class="summary-item">
          <div class="summary-value" style="color: #ea580c;">${highCount}</div>
          <div class="summary-label">⚠️ Élevées</div>
        </div>
        <div class="summary-item">
          <div class="summary-value" style="color: #d97706;">${(groupedAlerts.medium || []).length}</div>
          <div class="summary-label">⚡ Moyennes</div>
        </div>
        <div class="summary-item">
          <div class="summary-value" style="color: #ca8a04;">${(groupedAlerts.warning || []).length}</div>
          <div class="summary-label">🔔 Attention</div>
        </div>
      </div>
    </div>

    <div class="content">
      <h2 style="margin: 0 0 24px 0; font-size: 20px; color: #1f2937;">📋 Détail des alertes</h2>
      ${alertSections}
    </div>
    
    <div class="footer">
      Ce rapport a été généré automatiquement par SupervIA à ${new Date().toLocaleString('fr-FR')}.<br>
      Pour modifier vos préférences de notification, accédez aux paramètres de vos widgets.
    </div>
  </div>
</body>
</html>`;

    await sendEmail({ to: defaultTo, subject, text, html });
  }

  /**
   * Force le traitement immédiat du batch (pour les tests)
   */
  async flushBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.processBatch();
  }
}

/**
 * Instance singleton du service de batch d'alertes
 * 
 * Cette instance unique est partagée à travers toute l'application pour
 * garantir la cohérence du batch d'alertes. Elle est automatiquement
 * instanciée lors de l'import du module.
 * 
 * @type {AlertBatchService}
 * @example
 * // Import et utilisation
 * const alertBatchService = require('./alertBatchService');
 * 
 * // Ajouter une alerte au batch
 * alertBatchService.addAlert({
 *   alertType: 'gauge',
 *   severity: 'critical',
 *   widgetTitle: 'Memory Usage',
 *   hostName: 'Database Server',
 *   metricName: 'RAM utilization',
 *   currentValue: '95',
 *   threshold: '90',
 *   units: '%',
 *   condition: 'supérieur à 90'
 * });
 * 
 * // Forcer l'envoi immédiat (admin/tests)
 * await alertBatchService.flushBatch();
 */
const alertBatchService = new AlertBatchService();

module.exports = alertBatchService;
