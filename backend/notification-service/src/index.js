// backend/notification-service/src/index.js
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { buildApp } = require('./app');

dotenv.config();

const app = buildApp();
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

// Gestion des connexions Socket.io
// Auth Socket.io par JWT (si fourni dans l'auth header du handshake)
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    if (!authHeader) return next(); // autoriser connexion lecture publique si besoin
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = decoded;
    next();
  } catch (e) { next(); }
});

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

// Démarrage du serveur
server.listen(port, () => {
  logger.info(`Notification-service (Express + Socket.io) listening at http://localhost:${port}`);
});

module.exports = { io };

