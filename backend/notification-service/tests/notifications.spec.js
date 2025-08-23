const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}));

const { buildApp } = require('../src/app');

describe('notification-service notifications', () => {
  const app = buildApp();

  const signToken = (payload = { id: 1, email: 'user@test.dev' }) =>
    jwt.sign(payload, process.env.JWT_SECRET);

  it('POST /api/notifications/email/send -> 401 without auth', async () => {
    const res = await request(app).post('/api/notifications/email/send').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/notifications/email/send -> 200 when body valid with default recipient', async () => {
    const token = signToken();
    const res = await request(app)
      .post('/api/notifications/email/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 's', text: 't' }); // Utilise NOTIF_DEFAULT_TO
    expect(res.status).toBe(200);
  });

  it('POST /api/notifications/email/send -> 200 with valid JWT and body', async () => {
    const token = signToken();
    const res = await request(app)
      .post('/api/notifications/email/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'a@b.c', subject: 'Hello', text: 'World' });
    expect(res.status).toBe(200);
  });

  it('POST /api/notifications/email/welcome -> 401 without auth', async () => {
    const res = await request(app).post('/api/notifications/email/welcome').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/notifications/email/welcome -> 200 with internal key and required fields', async () => {
    const res = await request(app)
      .post('/api/notifications/email/welcome')
      .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY)
      .send({ to: 'john@example.com', name: 'John' });
    expect(res.status).toBe(200);
  });

  // Tests pour le nouvel endpoint d'alertes enrichies
  describe('Alert Email Endpoint', () => {
    it('POST /api/notifications/email/alert -> 401 without auth', async () => {
      const res = await request(app).post('/api/notifications/email/alert').send({});
      expect(res.status).toBe(401);
    });

    it('POST /api/notifications/email/alert -> 400 when missing required fields', async () => {
      const token = signToken();
      const res = await request(app)
        .post('/api/notifications/email/alert')
        .set('Authorization', `Bearer ${token}`)
        .send({ alertType: 'gauge' }); // Champs requis manquants
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Paramètres requis manquants');
    });

    it('POST /api/notifications/email/alert -> 200 with valid JWT and complete alert data', async () => {
      const token = signToken();
      const alertData = {
        alertType: 'gauge',
        severity: 'critical',
        widgetTitle: 'CPU Usage Monitor',
        hostName: 'Docker Host',
        metricName: 'CPU utilization',
        currentValue: '95.2',
        threshold: '90',
        units: '%',
        condition: 'supérieur à 90%',
        timestamp: new Date().toISOString(),
        dashboardUrl: 'https://supervia.local/dashboard-editor',
        additionalContext: {
          trend: 'En hausse depuis 15 minutes',
          duration: 'Alerte active depuis 5 minutes',
          previousValue: '87.3',
          frequency: '3ème alerte en 1 heure'
        }
      };

      const res = await request(app)
        .post('/api/notifications/email/alert')
        .set('Authorization', `Bearer ${token}`)
        .send(alertData);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Alerte envoyée avec succès.');
    });

    it('POST /api/notifications/email/alert -> 200 with internal API key', async () => {
      const alertData = {
        alertType: 'problems',
        severity: 'high',
        widgetTitle: 'Problèmes récents',
        hostName: 'Tous les hôtes',
        metricName: 'Nombre de problèmes actifs',
        currentValue: '5',
        threshold: '3'
      };

      const res = await request(app)
        .post('/api/notifications/email/alert')
        .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY)
        .send(alertData);
      
      expect(res.status).toBe(200);
    });

    it('POST /api/notifications/email/alert -> 200 with minimal required fields', async () => {
      const token = signToken();
      const minimalAlert = {
        alertType: 'availability',
        widgetTitle: 'Host Status',
        hostName: 'Test Host',
        metricName: 'Disponibilité',
        currentValue: 'Hors ligne',
        threshold: 'Disponible'
      };

      const res = await request(app)
        .post('/api/notifications/email/alert')
        .set('Authorization', `Bearer ${token}`)
        .send(minimalAlert);
      
      expect(res.status).toBe(200);
    });

    it('POST /api/notifications/email/alert -> handles different severity levels', async () => {
      const token = signToken();
      const severities = ['critical', 'high', 'medium', 'warning', 'info'];

      for (const severity of severities) {
        const alertData = {
          alertType: 'metricValue',
          severity,
          widgetTitle: `Test ${severity}`,
          hostName: 'Test Host',
          metricName: 'Test Metric',
          currentValue: '100',
          threshold: '50'
        };

        const res = await request(app)
          .post('/api/notifications/email/alert')
          .set('Authorization', `Bearer ${token}`)
          .send(alertData);
        
        expect(res.status).toBe(200);
      }
    });
  });
});


