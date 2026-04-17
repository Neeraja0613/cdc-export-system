const request = require('supertest');
const app = require('../index');

describe('API Tests', () => {

  test('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  test('watermark 404 for new consumer', async () => {
    const res = await request(app)
      .get('/exports/watermark')
      .set('X-Consumer-ID', 'new-consumer');

    expect(res.statusCode).toBe(404);
  });

});