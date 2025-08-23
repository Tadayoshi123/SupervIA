/**
 * Contrôleurs de notifications pour SupervIA
 * 
 * Ce module gère l'envoi de notifications par email avec templates enrichis :
 * - Emails génériques avec fallback HTML
 * - Alertes enrichies avec contexte détaillé
 * - Emails de bienvenue pour nouveaux utilisateurs
 * - Émission d'événements WebSocket temps-réel
 * 
 * @author SupervIA Team
 */

// backend/notification-service/src/controllers/notificationController.js
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

/**
 * Envoie un email générique avec template HTML automatique
 * 
 * Permet l'envoi d'emails avec contenu personnalisé. Si aucun destinataire n'est
 * fourni, utilise NOTIF_DEFAULT_TO. Génère automatiquement un template HTML
 * professionnel si seul le texte est fourni.
 * 
 * @param {import('express').Request} req - Requête avec body.{to?, subject, text, html?}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant pour erreurs
 * @returns {Promise<void>} Confirmation d'envoi
 */
const sendTestEmail = async (req, res, next) => {
  const { to, subject, text, html } = req.body;

  try {
    const defaultTo = process.env.NOTIF_DEFAULT_TO || '';
    const resolvedTo = (to && String(to).trim().length > 0)
      ? to
      : defaultTo;

    if (!resolvedTo || !subject || !text) {
      const error = new Error('Paramètres requis manquants. Fournissez "subject" et "text" ("to" facultatif si NOTIF_DEFAULT_TO configuré).');
      error.statusCode = 400;
      throw error;
    }

    // Si aucun HTML fourni, générer un gabarit simple inspiré du mail d'inscription
    const fallbackHtml = html || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; background:#f8fafc; padding:24px; }
    .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; max-width:640px; margin:0 auto; overflow:hidden; }
    .header { background-color: #2563eb; color: white; padding: 16px 20px; }
    .content { padding: 20px; white-space: pre-wrap; }
    .footer { background:#f1f5f9; padding: 12px 20px; font-size:12px; color:#475569; }
  </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h2 style="margin:0;">Alerte SupervIA</h2>
      </div>
      <div class="content">
        <h3 style="margin-top:0;">${subject}</h3>
        <pre style="white-space:pre-wrap;margin:0;">${text}</pre>
      </div>
      <div class="footer">Cet email a été généré automatiquement par SupervIA.</div>
    </div>
  </body>
  </html>`;

    logger.info(`Tentative d'envoi d'un email à ${resolvedTo}`);
    await sendEmail({ to: resolvedTo, subject, text, html: fallbackHtml });

    // Note: Pour émettre un événement socket, vous pouvez importer `io`
    // depuis `index.js` et l'utiliser ici.
    // Exemple: req.app.get('io').emit('notification', { message: 'Email envoyé!' });

    res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Envoie un email d'alerte enrichi avec template HTML professionnel
 * 
 * Cette fonction génère et envoie des emails d'alerte contextualisés pour les widgets
 * de supervision. Elle inclut une analyse automatique de sévérité, des templates HTML
 * responsives, et des informations contextuelles avancées (tendances, durée, etc.).
 * 
 * @param {Object} req - Requête Express contenant les données d'alerte
 * @param {string} req.body.alertType - Type de widget (gauge, multiChart, availability, problems, metricValue)
 * @param {string} req.body.severity - Niveau de sévérité (critical, high, medium, warning, info)
 * @param {string} req.body.widgetTitle - Titre du widget qui a déclenché l'alerte
 * @param {string} req.body.hostName - Nom de l'hôte concerné par l'alerte
 * @param {string} req.body.metricName - Nom de la métrique surveillée
 * @param {string} req.body.currentValue - Valeur actuelle qui a déclenché l'alerte
 * @param {string} req.body.threshold - Seuil configuré pour l'alerte
 * @param {string} req.body.units - Unité de mesure (%, MB, etc.)
 * @param {string} req.body.condition - Description de la condition de déclenchement
 * @param {string} req.body.timestamp - Horodatage ISO de l'alerte
 * @param {string} req.body.dashboardUrl - URL vers le dashboard concerné
 * @param {Object} req.body.additionalContext - Contexte additionnel (tendance, durée, fréquence)
 * @param {Object} res - Réponse Express
 * @param {Function} next - Middleware suivant pour gestion d'erreurs
 */
const sendAlertEmail = async (req, res, next) => {
  const { 
    alertType, 
    severity = 'warning',
    widgetTitle,
    hostName,
    metricName,
    currentValue,
    threshold,
    units = '',
    condition,
    timestamp,
    dashboardUrl,
    additionalContext = {}
  } = req.body;

  try {
    if (!alertType || !widgetTitle || !hostName || !metricName) {
      const error = new Error('Paramètres requis manquants pour l\'alerte. Fournissez au minimum: alertType, widgetTitle, hostName, metricName.');
      error.statusCode = 400;
      throw error;
    }

    const defaultTo = process.env.NOTIF_DEFAULT_TO || '';
    if (!defaultTo) {
      const error = new Error('Aucun destinataire configuré pour les alertes (NOTIF_DEFAULT_TO manquant).');
      error.statusCode = 500;
      throw error;
    }

    /**
     * Détermine l'icône, la couleur et le label selon le niveau de sévérité
     * 
     * Cette fonction mappe les niveaux de sévérité aux éléments visuels utilisés
     * dans les templates HTML et les notifications. Les couleurs suivent les
     * conventions UX standard (rouge = critique, orange = élevé, etc.).
     * 
     * @param {string} sev - Niveau de sévérité (critical, high, medium, warning, info)
     * @returns {Object} Objet contenant icon (emoji), color (hex), label (texte)
     */
    const getSeverityInfo = (sev) => {
      switch (sev.toLowerCase()) {
        case 'critical': return { icon: '🚨', color: '#dc2626', label: 'CRITIQUE' };
        case 'high': return { icon: '⚠️', color: '#ea580c', label: 'ÉLEVÉE' };
        case 'medium': return { icon: '⚡', color: '#d97706', label: 'MOYENNE' };
        case 'warning': return { icon: '⚠️', color: '#ca8a04', label: 'ATTENTION' };
        case 'info': return { icon: 'ℹ️', color: '#2563eb', label: 'INFO' };
        default: return { icon: '⚠️', color: '#6b7280', label: 'ALERTE' };
      }
    };

    const severityInfo = getSeverityInfo(severity);
    const formattedTimestamp = timestamp ? new Date(timestamp).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');
    
    // Construire le sujet enrichi avec icône et niveau de sévérité
    const subject = `${severityInfo.icon} [${severityInfo.label}] ${widgetTitle} - ${hostName}`;
    
    // Construire le texte enrichi pour les clients email sans support HTML
    const contextLines = [];
    if (additionalContext.trend) contextLines.push(`Tendance: ${additionalContext.trend}`);
    if (additionalContext.duration) contextLines.push(`Durée: ${additionalContext.duration}`);
    if (additionalContext.previousValue) contextLines.push(`Valeur précédente: ${additionalContext.previousValue}${units}`);
    if (additionalContext.frequency) contextLines.push(`Fréquence d'alerte: ${additionalContext.frequency}`);
    
    const text = `ALERTE SUPERVIA - ${severityInfo.label}

📊 Widget: ${widgetTitle}
🖥️  Hôte: ${hostName}
📈 Métrique: ${metricName}
⚡ Valeur actuelle: ${currentValue}${units}
🎯 Seuil: ${condition || 'dépassé'} ${threshold}${units}
🕐 Horodatage: ${formattedTimestamp}

${contextLines.length > 0 ? '📋 Contexte additionnel:\n' + contextLines.map(line => `• ${line}`).join('\n') + '\n' : ''}
${dashboardUrl ? `🔗 Voir le dashboard: ${dashboardUrl}\n` : ''}
---
Cette alerte a été générée automatiquement par SupervIA.
Pour désactiver ces notifications, modifiez les paramètres de votre widget.`;

    /**
     * Template HTML responsive et moderne pour les emails d'alerte
     * 
     * Ce template utilise un design professionnel avec :
     * - Header coloré selon la sévérité
     * - Sections organisées (détails, contexte, actions)
     * - Design responsive pour mobile et desktop
     * - Couleurs et icônes cohérentes avec l'interface SupervIA
     */
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Alerte SupervIA - ${severityInfo.label}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, ${severityInfo.color}, ${severityInfo.color}dd); color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .severity-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-top: 8px; }
    .content { padding: 24px; }
    .alert-details { background: #f8fafc; border-left: 4px solid ${severityInfo.color}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 500; color: #6b7280; }
    .detail-value { font-weight: 600; color: #1f2937; }
    .context-section { margin-top: 20px; padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24; }
    .context-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
    .context-list { margin: 0; padding-left: 20px; }
    .context-list li { margin: 4px 0; color: #78350f; }
    .action-button { display: inline-block; background: ${severityInfo.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px; }
    .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
    .timestamp { font-size: 14px; color: #6b7280; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${severityInfo.icon} Alerte SupervIA</h1>
      <div class="severity-badge">${severityInfo.label}</div>
    </div>
    
    <div class="content">
      <div class="alert-details">
        <div class="detail-row">
          <span class="detail-label">📊 Widget</span>
          <span class="detail-value">${widgetTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🖥️ Hôte</span>
          <span class="detail-value">${hostName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📈 Métrique</span>
          <span class="detail-value">${metricName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">⚡ Valeur actuelle</span>
          <span class="detail-value" style="color: ${severityInfo.color}; font-size: 18px;">${currentValue}${units}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🎯 Seuil</span>
          <span class="detail-value">${condition || 'dépassé'} ${threshold}${units}</span>
        </div>
      </div>

      ${contextLines.length > 0 ? `
      <div class="context-section">
        <div class="context-title">📋 Informations complémentaires</div>
        <ul class="context-list">
          ${contextLines.map(line => `<li>${line}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${dashboardUrl ? `<a href="${dashboardUrl}" class="action-button">🔗 Voir le dashboard</a>` : ''}
      
      <div class="timestamp">🕐 ${formattedTimestamp}</div>
    </div>
    
    <div class="footer">
      Cette alerte a été générée automatiquement par SupervIA.<br>
      Pour modifier vos préférences de notification, accédez aux paramètres de votre widget.
    </div>
  </div>
</body>
</html>`;

    logger.info(`Envoi d'une alerte ${severity} pour ${widgetTitle} sur ${hostName}`);
    await sendEmail({ to: defaultTo, subject, text, html });

    // Émission d'un événement socket pour les notifications temps réel
    const io = req.app.get('io');
    io.emit('alert-notification', { 
      type: alertType,
      severity,
      widgetTitle,
      hostName,
      metricName,
      currentValue,
      threshold,
      units,
      timestamp: formattedTimestamp,
      subject
    });

    res.status(200).json({ message: 'Alerte envoyée avec succès.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Envoie un email de bienvenue personnalisé à un nouvel utilisateur
 * 
 * Génère un email de bienvenue avec template HTML professionnel incluant :
 * - Message de bienvenue personnalisé
 * - Liste des fonctionnalités SupervIA
 * - Design responsive et moderne
 * - Émission d'événement WebSocket pour notification temps-réel
 * 
 * @param {import('express').Request} req - Requête avec body.{to, name?}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Middleware suivant pour erreurs
 * @returns {Promise<void>} Confirmation d'envoi et événement WebSocket
 */
const sendWelcomeEmail = async (req, res, next) => {
  const { to, name } = req.body;

  try {
    if (!to) {
      const error = new Error('Le champ "to" est requis.');
      error.statusCode = 400;
      throw error;
    }

    const userName = name || 'Nouvel utilisateur';
    const subject = 'Bienvenue sur SupervIA - Confirmation d\'inscription';
    
    const text = `Bonjour ${userName},

Bienvenue sur la plateforme SupervIA !

Votre inscription a été effectuée avec succès. Vous pouvez maintenant vous connecter et découvrir toutes les fonctionnalités de notre portail de supervision IT.

Fonctionnalités disponibles :
- Dashboards personnalisables avec drag & drop
- Surveillance et métriques via Zabbix
- Intelligence artificielle intégrée
- Recherche avancée
- Export PDF de vos rapports
- Notifications temps réel

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe SupervIA`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bienvenue sur SupervIA</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .features { background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .features ul { margin: 0; padding-left: 20px; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Bienvenue sur SupervIA</h1>
    </div>
    <div class="content">
        <p>Bonjour <strong>${userName}</strong>,</p>
        
        <p>Bienvenue sur la plateforme SupervIA !</p>
        
        <p>Votre inscription a été effectuée avec succès. Vous pouvez maintenant vous connecter et découvrir toutes les fonctionnalités de notre portail de supervision IT.</p>
        
        <div class="features">
            <h3>Fonctionnalités disponibles :</h3>
            <ul>
                <li>Dashboards personnalisables avec drag &amp; drop</li>
                <li>Surveillance et métriques via Zabbix</li>
                <li>Intelligence artificielle intégrée</li>
                <li>Recherche avancée</li>
                <li>Export PDF de vos rapports</li>
                <li>Notifications temps réel</li>
            </ul>
        </div>
        
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>L'équipe SupervIA</p>
    </div>
    <div class="footer">
        <p>SupervIA - Portail de supervision IT</p>
    </div>
</body>
</html>`;

    logger.info(`Envoi de l'email de bienvenue à ${to}`);
    await sendEmail({ to, subject, text, html });

    // Émission d'un événement socket pour les notifications temps réel
    const io = req.app.get('io');
    io.emit('user-registered', { 
      message: `Nouvel utilisateur inscrit: ${userName}`,
      email: to,
      timestamp: new Date()
    });

    res.status(200).json({ message: 'Email de bienvenue envoyé avec succès.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendTestEmail,
  sendAlertEmail,
  sendWelcomeEmail,
};
