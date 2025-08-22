const express = require('express');
const router = express.Router();
const { suggestWidgets, thresholds, anomaly, predict, summarize, generateTitle } = require('../services/aiController');
const authenticateRequest = require('../middleware/authenticateRequest');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Endpoints d'aide IA
 */

router.post('/suggest/widgets', authenticateRequest, suggestWidgets);
router.post('/thresholds', authenticateRequest, thresholds);
router.post('/anomaly', authenticateRequest, anomaly);
router.post('/predict', authenticateRequest, predict);
router.post('/summarize', authenticateRequest, summarize);
router.post('/generate/title', authenticateRequest, generateTitle);

module.exports = router;


