// backend/notification-service/src/controllers/notificationController.js
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

const sendTestEmail = async (req, res, next) => {
  const { to, subject, text, html } = req.body;

  try {
    if (!to || !subject || !text) {
      const error = new Error('Les champs "to", "subject", et "text" sont requis.');
      error.statusCode = 400;
      throw error;
    }

    logger.info(`Tentative d'envoi d'un email à ${to}`);
    await sendEmail({ to, subject, text, html });

    // Note: Pour émettre un événement socket, vous pouvez importer `io`
    // depuis `index.js` et l'utiliser ici.
    // Exemple: req.app.get('io').emit('notification', { message: 'Email envoyé!' });

    res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    next(error);
  }
};

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
  sendWelcomeEmail,
};
