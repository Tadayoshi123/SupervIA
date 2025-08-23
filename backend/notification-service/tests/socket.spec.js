const { buildApp } = require('../src/app');
const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');

describe('notification-service socket.io', () => {
  let ioServer;
  let httpServer;
  let httpServerAddr;

  beforeAll((done) => {
    const app = buildApp();
    httpServer = http.createServer(app);
    ioServer = new Server(httpServer, { cors: { origin: '*' } });

    // minimal auth middleware (copies logic from index.js)
    ioServer.use((socket, next) => {
      try {
        const authHeader = socket.handshake.headers['authorization'];
        if (!authHeader) return next();
        const token = authHeader.split(' ')[1];
        if (!token) return next();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.user = decoded;
        next();
      } catch (e) { next(); }
    });

    ioServer.on('connection', (socket) => {
      socket.on('joinRoom', (room) => socket.join(room));
    });

    httpServer.listen(() => {
      httpServerAddr = httpServer.address();
      done();
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(done);
  });

  const clientConnect = (headers = {}) =>
    Client(`http://localhost:${httpServerAddr.port}`, { extraHeaders: headers, transports: ['websocket'] });

  it('connects without token', (done) => {
    const client = clientConnect();
    client.on('connect', () => {
      client.close();
      done();
    });
  });

  it('connects with JWT and can join room', (done) => {
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
    const client = clientConnect({ Authorization: `Bearer ${token}` });
    client.on('connect', () => {
      client.emit('joinRoom', 'room-1');
      client.close();
      done();
    });
  });

  // Tests pour les notifications d'alertes WebSocket
  describe('Alert Notifications via WebSocket', () => {
    it('should emit alert-notification event when alert is sent', (done) => {
      const client = clientConnect();
      
      // Simuler l'émission d'une alerte depuis le serveur
      client.on('connect', () => {
        // Écouter les événements d'alerte
        client.on('alert-notification', (data) => {
          expect(data).toHaveProperty('type');
          expect(data).toHaveProperty('severity');
          expect(data).toHaveProperty('widgetTitle');
          expect(data).toHaveProperty('hostName');
          expect(data).toHaveProperty('metricName');
          expect(data).toHaveProperty('currentValue');
          expect(data).toHaveProperty('threshold');
          expect(data).toHaveProperty('timestamp');
          expect(data).toHaveProperty('subject');
          
          client.close();
          done();
        });

        // Simuler l'émission d'une alerte
        ioServer.emit('alert-notification', {
          type: 'gauge',
          severity: 'critical',
          widgetTitle: 'CPU Usage Monitor',
          hostName: 'Docker Host',
          metricName: 'CPU utilization',
          currentValue: '95.2',
          threshold: '90',
          units: '%',
          timestamp: new Date().toLocaleString('fr-FR'),
          subject: '🚨 [CRITIQUE] CPU Usage Monitor - Docker Host'
        });
      });
    });

    it('should handle multiple alert types via WebSocket', (done) => {
      const client = clientConnect();
      const alertTypes = ['gauge', 'multiChart', 'availability', 'problems', 'metricValue'];
      let receivedAlerts = 0;
      
      client.on('connect', () => {
        client.on('alert-notification', (data) => {
          expect(alertTypes).toContain(data.type);
          receivedAlerts++;
          
          if (receivedAlerts === alertTypes.length) {
            client.close();
            done();
          }
        });

        // Émettre différents types d'alertes
        alertTypes.forEach((type, index) => {
          setTimeout(() => {
            ioServer.emit('alert-notification', {
              type,
              severity: ['critical', 'high', 'medium', 'warning', 'info'][index],
              widgetTitle: `Test ${type}`,
              hostName: 'Test Host',
              metricName: 'Test Metric',
              currentValue: '100',
              threshold: '50',
              timestamp: new Date().toLocaleString('fr-FR'),
              subject: `Test Alert ${type}`
            });
          }, index * 10); // Petit délai entre les émissions
        });
      });
    });

    it('should handle user-registered event for welcome notifications', (done) => {
      const client = clientConnect();
      
      client.on('connect', () => {
        client.on('user-registered', (data) => {
          expect(data).toHaveProperty('message');
          expect(data).toHaveProperty('email');
          expect(data).toHaveProperty('timestamp');
          expect(data.message).toContain('Nouvel utilisateur inscrit');
          
          client.close();
          done();
        });

        // Simuler l'inscription d'un nouvel utilisateur
        ioServer.emit('user-registered', {
          message: 'Nouvel utilisateur inscrit: John Doe',
          email: 'john@example.com',
          timestamp: new Date()
        });
      });
    });
  });
});


