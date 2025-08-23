const request = require('supertest');
const { buildApp } = require('../src/app');

describe('Dashboards endpoints', () => {
  const app = buildApp();
  const key = process.env.INTERNAL_API_KEY;

  it('POST /api/dashboards creates dashboard', async () => {
    const payload = { name: 'Mon dash', userId: 1, widgets: [] };
    const res = await request(app)
      .post('/api/dashboards')
      .set('X-Internal-Api-Key', key)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Mon dash');
  });

  it('GET /api/users/:userId/dashboards returns list', async () => {
    const res = await request(app)
      .get('/api/users/1/dashboards')
      .set('X-Internal-Api-Key', key);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


