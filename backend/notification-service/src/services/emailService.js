/**
 * Service d'envoi d'emails pour SupervIA
 * 
 * Interface sécurisée pour l'envoi d'emails via SMTP avec :
 * - Configuration Nodemailer robuste
 * - Vérification de configuration au démarrage
 * - Gestion d'erreurs sécurisée (pas d'exposition des credentials)
 * - Support multi-providers (Mailtrap, Gmail, SendGrid)
 * - Logs détaillés avec preview URLs
 * 
 * @author SupervIA Team
 */

// backend/notification-service/src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.fatal('Variables d\'environnement SMTP manquantes. Le service de messagerie ne peut pas démarrer.');
    // Dans un vrai scénario, on pourrait vouloir arrêter le process : process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Vérifier la configuration au démarrage (sauf en test)
if (process.env.NODE_ENV !== 'test') {
  transporter.verify((error, success) => {
    if (error) {
      logger.fatal(error, 'La configuration SMTP est invalide.');
    } else {
      logger.info('Le service de messagerie est prêt à envoyer des emails via Mailtrap.');
    }
  });
}

/**
 * Envoie un email via le transporteur SMTP configuré
 * 
 * Fonction principale d'envoi d'emails avec gestion d'erreurs sécurisée.
 * Les erreurs SMTP détaillées ne sont pas exposées aux clients pour éviter
 * la fuite d'informations sensibles sur la configuration.
 * 
 * @param {Object} mailOptions - Options de l'email à envoyer
 * @param {string} mailOptions.to - Adresse email du destinataire
 * @param {string} mailOptions.subject - Sujet de l'email
 * @param {string} mailOptions.text - Corps du message en texte brut
 * @param {string} [mailOptions.html] - Corps du message en HTML (optionnel)
 * @returns {Promise<Object>} Informations sur l'email envoyé (messageId, preview URL)
 * @throws {Error} Erreur générique si l'envoi échoue (détails masqués)
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info({ msg: `Email envoyé à ${to}`, messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) });
    return info;
  } catch (error) {
    logger.error(error, `Échec de l'envoi de l'email à ${to}`);
    // Il est important de ne pas propager l'erreur brute qui pourrait contenir des informations sensibles
    throw new Error('Le serveur de messagerie a rencontré une erreur.');
  }
};

module.exports = {
  sendEmail,
};
