const request = require('supertest');
const { buildApp } = require('../src/app');

describe('Health endpoint', () => {
  it('GET /health returns 200', async () => {
    const app = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });
});


