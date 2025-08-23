const request = require('supertest');
const { buildApp } = require('../src/app');

describe('notification-service health', () => {
  it('GET /health returns 200', async () => {
    const app = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service', 'notification-service');
  });

  it('OPTIONS preflight on notifications passes CORS', async () => {
    const app = buildApp();
    const res = await request(app)
      .options('/api/notifications/email/send')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');
    expect([200, 204]).toContain(res.status);
  });
});


