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

  describe('POST /api/notifications/batch/alert', () => {
    it('should add alert to batch successfully', async () => {
      const token = signToken();
      const alertData = {
        alertType: 'multiChart',
        severity: 'warning',
        widgetTitle: 'Test Widget',
        hostName: 'Test Host',
        metricName: 'CPU usage',
        currentValue: '85',
        threshold: '80',
        units: '%',
        condition: 'supérieur à 80'
      };

      const response = await request(app)
        .post('/api/notifications/batch/alert')
        .set('Authorization', `Bearer ${token}`)
        .send(alertData)
        .expect(200);

      expect(response.body.message).toBe('Alerte ajoutée au batch avec succès.');
      expect(response.body.batchInfo).toHaveProperty('alertsInBatch');
      expect(response.body.batchInfo).toHaveProperty('batchDuration');
      expect(response.body.batchInfo.alertsInBatch).toBeGreaterThan(0);
    });

    it('should return 400 if required fields are missing', async () => {
      const token = signToken();
      const incompleteData = {
        alertType: 'gauge',
        severity: 'critical'
        // Missing widgetTitle, hostName, metricName
      };

      await request(app)
        .post('/api/notifications/batch/alert')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteData)
        .expect(400);
    });

    it('should return 401 without authorization', async () => {
      const alertData = {
        alertType: 'metricValue',
        widgetTitle: 'Test',
        hostName: 'Host',
        metricName: 'Metric'
      };

      await request(app)
        .post('/api/notifications/batch/alert')
        .send(alertData)
        .expect(401);
    });
  });

  describe('POST /api/notifications/batch/flush', () => {
    it('should flush batch if there are alerts', async () => {
      const token = signToken();
      const response = await request(app)
        .post('/api/notifications/batch/flush')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Le message peut être soit "Aucune alerte" soit "Batch de X alerte(s) envoyé"
      expect(response.body.message).toMatch(/^(Aucune alerte en attente dans le batch\.|Batch de \d+ alerte\(s\) envoyé avec succès\.)$/);
    });

    it('should return 401 without authorization', async () => {
      await request(app)
        .post('/api/notifications/batch/flush')
        .expect(401);
    });
  });
});


