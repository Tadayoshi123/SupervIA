const request = require('supertest');
const { buildApp } = require('../src/app');

// Mock llmClient pour éviter les appels externes
jest.mock('../src/services/llmClient', () => ({
  callChatLLM: jest.fn().mockResolvedValue({ text: 'Test LLM response' })
}));

describe('AI endpoints', () => {
  const app = buildApp();
  const validToken = require('jsonwebtoken').sign({ id: 1 }, process.env.JWT_SECRET);

  describe('POST /api/ai/thresholds', () => {
    it('calculates thresholds from values', async () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const res = await request(app)
        .post('/api/ai/thresholds')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ values });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('warning');
      expect(res.body).toHaveProperty('critical');
      expect(res.body.warning).toBeGreaterThan(0);
      expect(res.body.critical).toBeGreaterThan(res.body.warning);
    });

    it('handles empty values array', async () => {
      const res = await request(app)
        .post('/api/ai/thresholds')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ values: [] });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe(0);
      expect(res.body.critical).toBe(0);
    });
  });

  describe('POST /api/ai/anomaly', () => {
    it('detects anomalies in time series', async () => {
      const series = [
        { ts: 1, value: 10 },
        { ts: 2, value: 12 },
        { ts: 3, value: 11 },
        { ts: 4, value: 100 }, // anomalie
        { ts: 5, value: 9 }
      ];

      const res = await request(app)
        .post('/api/ai/anomaly')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ series });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('anomalies');
      expect(Array.isArray(res.body.anomalies)).toBe(true);
    });
  });

  describe('POST /api/ai/predict', () => {
    it('predicts future values', async () => {
      const series = [
        { ts: 1, value: 10 },
        { ts: 2, value: 20 },
        { ts: 3, value: 30 },
        { ts: 4, value: 40 }
      ];

      const res = await request(app)
        .post('/api/ai/predict')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ series, horizon: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slope');
      expect(res.body).toHaveProperty('forecast');
      expect(Array.isArray(res.body.forecast)).toBe(true);
      expect(res.body.forecast).toHaveLength(3);
    });
  });

  describe('POST /api/ai/suggest/widgets', () => {
    it('suggests widgets based on host items', async () => {
      const items = [
        { itemid: '1', name: 'CPU utilization', key_: 'system.cpu.util', value_type: '0', units: '%', lastvalue: '85' },
        { itemid: '2', name: 'Memory utilization', key_: 'vm.memory.util', value_type: '0', units: '%', lastvalue: '70' },
        { itemid: '3', name: 'ICMP ping', key_: 'icmpping', value_type: '3', units: '', lastvalue: '1' }
      ];

      const res = await request(app)
        .post('/api/ai/suggest/widgets')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ hostId: 'host123', items });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0]).toHaveProperty('title');
    });

    it('provides fallback when no items', async () => {
      const res = await request(app)
        .post('/api/ai/suggest/widgets')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ hostId: 'host123', items: [] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/ai/summarize', () => {
    it('summarizes infrastructure state', async () => {
      const contextData = {
        problemsCount: 3,
        hostsOnline: 8,
        hostsTotal: 10,
        problems: [
          { severity: '4', name: 'High CPU usage' },
          { severity: '2', name: 'Disk space low' }
        ],
        widgets: [
          { type: 'multiChart' },
          { type: 'gauge' }
        ],
        topMetrics: [
          { name: 'CPU usage', value: '95', units: '%' }
        ],
        timeRange: '1h'
      };

      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contextData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('text');
      expect(typeof res.body.text).toBe('string');
      expect(res.body.text.length).toBeGreaterThan(0);
    });

    it('handles minimal context', async () => {
      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('text');
    });
  });

  describe('POST /api/ai/generate/title', () => {
    it('generates title for widget', async () => {
      const res = await request(app)
        .post('/api/ai/generate/title')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'multiChart',
          items: [
            { name: 'CPU utilization' },
            { name: 'Memory usage' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(typeof res.body.title).toBe('string');
      expect(res.body.title.length).toBeGreaterThan(0);
    });

    it('handles minimal input', async () => {
      const res = await request(app)
        .post('/api/ai/generate/title')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ type: 'gauge' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
    });
  });
});
