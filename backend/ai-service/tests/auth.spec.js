const request = require('supertest');
const { buildApp } = require('../src/app');

// Mock llmClient pour éviter les appels externes
jest.mock('../src/services/llmClient', () => ({
  callChatLLM: jest.fn().mockResolvedValue({ text: 'Test summary response' })
}));

describe('Authentication middleware', () => {
  const app = buildApp();

  it('denies access without authorization', async () => {
    const res = await request(app)
      .post('/api/ai/thresholds')
      .send({ values: [1, 2, 3] });
    expect(res.status).toBe(401);
  });

  it('allows access with valid JWT token', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
    
    const res = await request(app)
      .post('/api/ai/thresholds')
      .set('Authorization', `Bearer ${token}`)
      .send({ values: [10, 20, 30, 40, 50] });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('warning');
    expect(res.body).toHaveProperty('critical');
  });

  it('allows access with valid internal API key', async () => {
    const res = await request(app)
      .post('/api/ai/thresholds')
      .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY)
      .send({ values: [10, 20, 30, 40, 50] });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('warning');
    expect(res.body).toHaveProperty('critical');
  });

  it('denies access with invalid JWT token', async () => {
    const res = await request(app)
      .post('/api/ai/thresholds')
      .set('Authorization', 'Bearer invalid-token')
      .send({ values: [1, 2, 3] });
    expect(res.status).toBe(403);
  });
});
