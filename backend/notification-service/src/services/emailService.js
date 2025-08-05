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

// Vérifier la configuration au démarrage
transporter.verify((error, success) => {
  if (error) {
    logger.fatal(error, 'La configuration SMTP est invalide.');
  } else {
    logger.info('Le service de messagerie est prêt à envoyer des emails via Mailtrap.');
  }
});

/**
 * Envoie un email.
 * @param {object} mailOptions
 * @param {string} mailOptions.to
 * @param {string} mailOptions.subject
 * @param {string} mailOptions.text
 * @param {string} [mailOptions.html]
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
