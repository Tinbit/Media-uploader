
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';

describe('Media API', () => {
  it('health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects unsupported type', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .attach('files', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(200);
    expect(res.body.results[0].ok).toBe(false);
  });

  it('uploads and lists an image', async () => {
    const imgPath = path.join(__dirname, 'fixtures', 'tiny.png');
    const res = await request(app)
      .post('/api/media/upload')
      .attach('files', fs.readFileSync(imgPath), { filename: 'testikuva.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const ok = res.body.results[0].ok;
    expect(ok).toBe(true);
    const item = res.body.results[0].item;
    expect(item.originalName).toContain('test');
    const list = await request(app).get('/api/media');
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);
  });
});
