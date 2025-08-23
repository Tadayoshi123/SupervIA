const express = require('express');
const dotenv = require('dotenv');
const logger = require('./logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3000;

// Démarrage du serveur
app.listen(port, () => {
  logger.info(`ai-service listening at http://localhost:${port}`);
});

module.exports = app;
