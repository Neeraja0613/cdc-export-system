jest.mock('../db', () => ({
  query: jest.fn()
}));

const request = require('supertest');
const app = require('../index');
const db = require('../db');

describe('API Tests', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });

  test('watermark 404 for new consumer', async () => {
    // Mock DB to return no rows
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/exports/watermark')
      .set('X-Consumer-ID', 'new-consumer');

    expect(res.statusCode).toBe(404);
  });

  test('full export starts', async () => {
    const res = await request(app)
      .post('/exports/full')
      .set('X-Consumer-ID', 'consumer-test');

    expect(res.statusCode).toBe(202);
  });

});