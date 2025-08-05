// src/index.js pour chaque service backend

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares de base
app.use(cors()); // Active CORS pour toutes les routes
app.use(helmet()); // Ajoute des en-têtes de sécurité HTTP
app.use(express.json()); // Pour parser le JSON dans les requêtes

// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ai-service' });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`ai-service listening at http://localhost:${port}`);
});
