import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setup, type TestEnv } from './helpers.js';
import { loadConfig } from '../src/config/env.js';
import { safeNextPath } from '../src/modules/auth/google.js';
import { detectSignature } from '../src/lib/media-types.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setup();
});
afterAll(() => env.close());

describe('security middleware', () => {
  it('sets hardened headers and request ids', async () => {
    const res = await request(env.app).get('/healthz');
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toMatch(/^[\w-]{8,}$/);
    expect((await request(env.app).get('/readyz')).body).toEqual({ status: 'ready' });
  });

  it('CORS allows only allow-listed origins', async () => {
    const ok = await request(env.app).get('/api/v1/media').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const evil = await request(env.app).get('/api/v1/media').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('blocks cross-site state-changing requests (CSRF)', async () => {
    const res = await request(env.app)
      .post('/api/v1/auth/signin')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.detail).toBe('Cross-site request blocked');
    const same = await request(env.app).post('/api/v1/auth/signout').set('Origin', 'http://localhost:3000');
    expect(same.status).toBe(204);
  });

  it('limits body size and handles malformed JSON', async () => {
    const big = await request(env.app).post('/api/v1/auth/signin').set('Content-Type', 'application/json').send(JSON.stringify({ x: 'a'.repeat(200_000) }));
    expect(big.status).toBe(413);
    const bad = await request(env.app).post('/api/v1/auth/signin').set('Content-Type', 'application/json').send('{bad');
    expect(bad.status).toBe(400);
    expect(bad.body.detail).toBe('Malformed JSON body');
  });

  it('returns problem+json 404 for unknown routes and blocks file path traversal', async () => {
    const nf = await request(env.app).get('/api/v1/nope');
    expect(nf.status).toBe(404);
    expect(nf.headers['content-type']).toMatch(/problem\+json/);
    const trav = await request(env.app).get('/api/v1/files/..%2f..%2fpackage.json');
    expect([400, 403, 404]).toContain(trav.status);
  });

  it('rate limits failed sign-ins', async () => {
    const limited = await setup({ RATE_LIMIT_AUTH: '3' });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 5; i++) {
        codes.push((await request(limited.app).post('/api/v1/auth/signin').send({ email: 'x@y.co', password: 'nope-nope' })).status);
      }
      expect(codes).toEqual([401, 401, 401, 429, 429]);
    } finally {
      await limited.close();
    }
  });
});

describe('config & helpers', () => {
  it('fails fast on weak secrets and unsafe production config', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).toThrow(/DATABASE_URL[\s\S]*STORAGE_DRIVER/);
    expect(() => loadConfig({ JWT_SECRET: 'x'.repeat(40), STORAGE_DRIVER: 's3' })).toThrow(/S3_BUCKET/);
    const ok = loadConfig({ JWT_SECRET: 'x'.repeat(40), GOOGLE_CLIENT_ID: 'your_google_client_id', GOOGLE_CLIENT_SECRET: 'y' });
    expect(ok.googleOAuthEnabled).toBe(false); // placeholders are treated as unset
  });

  it('only allows safe post-login redirect paths', () => {
    expect(safeNextPath('/u/ada')).toBe('/u/ada');
    expect(safeNextPath('//evil.example')).toBe('/feed');
    expect(safeNextPath('/\\evil.example')).toBe('/feed');
    expect(safeNextPath('https://evil.example')).toBe('/feed');
    expect(safeNextPath(undefined)).toBe('/feed');
  });

  it('detects file signatures', () => {
    expect(detectSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(detectSignature(Buffer.from('....ftypisom'))).toBe('isobmff');
    expect(detectSignature(Buffer.from('ID3\x04'))).toBe('mp3');
    expect(detectSignature(Buffer.from('<svg>'))).toBeUndefined();
  });
});
