const request = require('supertest');
const axios = require('axios');
jest.mock('axios');

const { buildApp } = require('../src/app');

describe('auth-service basic flows', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('POST /auth/register returns 400 when missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ email: '' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/register 201 on fresh user (db-service mocked)', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 1, email: 'john@example.com' } });
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'john@example.com', password: 'secret', name: 'John' });
    expect(res.status).toBe(201);
  });

  it('POST /auth/login returns 400 when missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: '' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login 200 with correct credentials (db-service mocked)', async () => {
    const bcrypt = require('bcryptjs');
    const password = 'secret';
    const hash = await bcrypt.hash(password, 10);
    axios.get.mockResolvedValueOnce({ data: { id: 1, email: 'john@example.com', password: hash } });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'john@example.com', password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /auth/login 401 with wrong credentials (db-service mocked)', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('other', 10);
    axios.get.mockResolvedValueOnce({ data: { id: 1, email: 'john@example.com', password: hash } });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'john@example.com', password: 'bad' });
    expect(res.status).toBe(401);
  });
});


