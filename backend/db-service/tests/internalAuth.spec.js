const request = require('supertest');
const { buildApp } = require('../src/app');

describe('Internal key middleware', () => {
  const app = buildApp();
  it('denies access without X-Internal-Api-Key', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('allows access with valid key', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY);
    // prisma is mocked to resolve []
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


