const request = require('supertest');
const { buildApp } = require('../src/app');

describe('Users endpoints', () => {
  const app = buildApp();
  const key = process.env.INTERNAL_API_KEY;

  it('GET /api/users returns list', async () => {
    const res = await request(app).get('/api/users').set('X-Internal-Api-Key', key);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/users creates user (email only for OAuth)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('X-Internal-Api-Key', key)
      .send({ email: 'new@example.com', name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email');
    expect(res.body).not.toHaveProperty('password');
  });
});


