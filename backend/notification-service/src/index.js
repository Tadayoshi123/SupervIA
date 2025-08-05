// backend/notification-service/src/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rend 'io' accessible dans les routes via req.app.get('io')
app.set('io', io);

const port = process.env.PORT || 3000;

// Middleware pour la documentation Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middlewares de base
app.use(cors());
app.use(helmet());
app.use(express.json());

// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'notification-service' });
});

// Utilisation des routes
app.use('/api/notifications', notificationRoutes);

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  logger.info(`Un utilisateur s'est connecté via socket: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`L'utilisateur s'est déconnecté: ${socket.id}`);
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} a rejoint la room ${room}`);
  });
});

// Middleware de gestion des erreurs (doit être le dernier)
app.use(errorHandler);

// Démarrage du serveur
server.listen(port, () => {
  logger.info(`Notification-service (Express + Socket.io) listening at http://localhost:${port}`);
});

module.exports = { io };

