import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setup, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setup();
});
afterAll(() => env.close());

describe('auth', () => {
  it('signs up, sets an httpOnly session cookie and returns the current user', async () => {
    const res = await request(env.app)
      .post('/api/v1/auth/signup')
      .send({ name: 'Ada Lovelace', email: 'ADA@Example.com ', password: 'analytical-engine' });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', handle: 'ada-lovelace', role: 'user' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/th_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects duplicate emails, weak passwords and invalid emails with problem+json', async () => {
    const dup = await request(env.app).post('/api/v1/auth/signup').send({ name: 'Ada', email: 'ada@example.com', password: 'whatever-123' });
    expect(dup.status).toBe(409);
    expect(dup.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(dup.body).toMatchObject({ status: 409, title: 'Conflict' });

    const weak = await request(env.app).post('/api/v1/auth/signup').send({ name: 'B', email: 'b@example.com', password: '123' });
    expect(weak.status).toBe(400);
    expect(weak.body.detail).toBe('Password must be at least 8 characters');
    expect(weak.body.errors[0].path).toBe('password');

    const bad = await request(env.app).post('/api/v1/auth/signup').send({ name: 'B', email: 'nope', password: '12345678' });
    expect(bad.body.detail).toBe('Please enter a valid email address');
  });

  it('generates unique handles for duplicate names', async () => {
    const { user } = await env.signup('Ada Lovelace', 'ada2@example.com');
    expect(user.handle).toMatch(/^ada-lovelace-[0-9a-f]{4}$/);
  });

  it('signs in with a generic error for wrong password and unknown email', async () => {
    const wrong = await request(env.app).post('/api/v1/auth/signin').send({ email: 'ada@example.com', password: 'wrong-password' });
    const unknown = await request(env.app).post('/api/v1/auth/signin').send({ email: 'ghost@example.com', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.detail).toBe('Invalid email or password');
    expect(unknown.body.detail).toBe(wrong.body.detail);

    const agent = request.agent(env.app);
    const ok = await agent.post('/api/v1/auth/signin').send({ email: 'Ada@example.com', password: 'analytical-engine' });
    expect(ok.status).toBe(200);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.data.user.email).toBe('ada@example.com');

    const out = await agent.post('/api/v1/auth/signout');
    expect(out.status).toBe(204);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('rejects tampered session cookies', async () => {
    const res = await request(env.app).get('/api/v1/auth/me').set('Cookie', 'th_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.');
    expect(res.status).toBe(401);
  });

  it('reports providers and refuses Google login when not configured', async () => {
    expect((await request(env.app).get('/api/v1/auth/providers')).body.data).toEqual({ google: false });
    const g = await request(env.app).get('/api/v1/auth/google');
    expect(g.status).toBe(503);
  });
});

describe('google oauth (configured)', () => {
  it('redirects to Google with state cookie and rejects callbacks without matching state', async () => {
    const g = await setup({ GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'csecret' });
    try {
      const start = await request(g.app).get('/api/v1/auth/google?next=/u/ada');
      expect(start.status).toBe(302);
      const loc = new URL(start.headers.location!);
      expect(loc.host).toBe('accounts.google.com');
      expect(loc.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/v1/auth/google/callback');
      expect(String(start.headers['set-cookie'])).toMatch(/th_oauth=/);

      const cb = await request(g.app).get('/api/v1/auth/google/callback?code=x&state=forged');
      expect(cb.status).toBe(302);
      expect(cb.headers.location).toBe('http://localhost:3000/signin?error=oauth');
    } finally {
      await g.close();
    }
  });
});
