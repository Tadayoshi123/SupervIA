const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('axios');
const axios = require('axios');

const { buildApp } = require('../src/app');

describe('metrics-service endpoints', () => {
  const app = buildApp();
  const signToken = (payload = { id: 1, email: 'user@test.dev' }) => jwt.sign(payload, process.env.JWT_SECRET);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET /api/metrics/hosts -> 401 without auth', async () => {
    const res = await request(app).get('/api/metrics/hosts');
    expect(res.status).toBe(401);
  });

  it('GET /api/metrics/hosts -> 200 with JWT (axios mocked)', async () => {
    axios.post.mockImplementation((url, body) => {
      if (body && body.method === 'user.login') {
        return Promise.resolve({ data: { result: 'auth-token' } });
      }
      if (body && body.method === 'host.get') {
        return Promise.resolve({ data: { result: [{ hostid: '1', name: 'Host-1', status: '0' }] } });
      }
      return Promise.resolve({ data: { result: [] } });
    });

    const token = signToken();
    const res = await request(app)
      .get('/api/metrics/hosts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/metrics/hosts/summary -> 200 with JWT', async () => {
    axios.post.mockImplementation((url, body) => {
      if (body && body.method === 'user.login') {
        return Promise.resolve({ data: { result: 'auth-token' } });
      }
      if (body && body.method === 'host.get') {
        return Promise.resolve({ data: { result: [
          { status: '0', available: '1' },
          { status: '0', available: '0', snmp_available: '1' },
          { status: '0', available: '0' },
        ] } });
      }
      return Promise.resolve({ data: { result: [] } });
    });

    const token = signToken();
    const res = await request(app)
      .get('/api/metrics/hosts/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total', 3);
    expect(res.body).toHaveProperty('online', 2);
  });

  it('GET /api/metrics/items/123 -> 200 with JWT', async () => {
    axios.post.mockImplementation((url, body) => {
      if (body && body.method === 'user.login') {
        return Promise.resolve({ data: { result: 'auth-token' } });
      }
      if (body && body.method === 'item.get') {
        return Promise.resolve({ data: { result: [{ itemid: 'a', name: 'CPU', lastvalue: '10' }] } });
      }
      return Promise.resolve({ data: { result: [] } });
    });

    const token = signToken();
    const res = await request(app)
      .get('/api/metrics/items/123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/metrics/problems -> 200 with JWT', async () => {
    axios.post.mockImplementation((url, body) => {
      if (body && body.method === 'user.login') {
        return Promise.resolve({ data: { result: 'auth-token' } });
      }
      if (body && body.method === 'problem.get') {
        return Promise.resolve({ data: { result: [] } });
      }
      return Promise.resolve({ data: { result: [] } });
    });

    const token = signToken();
    const res = await request(app)
      .get('/api/metrics/problems')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


