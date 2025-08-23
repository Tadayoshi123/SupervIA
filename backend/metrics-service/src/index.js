// backend/metrics-service/src/index.js
const express = require('express');
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`metrics-service listening at http://localhost:${port}`);
});
