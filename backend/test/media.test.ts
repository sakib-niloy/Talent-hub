import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setup, PNG, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setup();
});
afterAll(() => env.close());

describe('media upload flow', () => {
  it('uploads via ticket -> signed PUT -> complete and serves the file with sandbox headers', async () => {
    const { agent } = await env.signup('Uma');
    const { ticket, put, complete } = await env.upload(agent);
    expect(ticket.status).toBe(201);
    expect(ticket.body.data.upload).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/png' } });
    expect(put!.status).toBe(200);
    expect(complete!.status).toBe(200);
    const m = complete!.body.data;
    expect(m).toMatchObject({ kind: 'photo', title: 'Sunset', likeCount: 0, commentCount: 0, likedByMe: false, sizeBytes: PNG.length });
    expect(m.author.handle).toBe('uma');

    const file = await request(env.app).get(m.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['content-security-policy']).toContain('sandbox');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
  });

  it('hides pending uploads from feeds', async () => {
    const { agent } = await env.signup('Pending');
    const t = await agent.post('/api/v1/media').send({ kind: 'photo', title: 'x', mimeType: 'image/png', sizeBytes: 10 });
    expect(t.status).toBe(201);
    const list = await request(env.app).get('/api/v1/media?author=pending');
    expect(list.body.data).toHaveLength(0);
    expect((await request(env.app).get(`/api/v1/media/${t.body.data.mediaId}`)).status).toBe(404);
  });

  it('rejects disallowed types, oversized files and spoofed content', async () => {
    const { agent } = await env.signup('Mallory');
    const svg = await agent.post('/api/v1/media').send({ kind: 'photo', title: 'x', mimeType: 'image/svg+xml', sizeBytes: 10 });
    expect(svg.status).toBe(415);
    const big = await agent.post('/api/v1/media').send({ kind: 'photo', title: 'x', mimeType: 'image/png', sizeBytes: 11 * 1024 * 1024 });
    expect(big.status).toBe(413);

    const html = Buffer.from('<html><script>alert(1)</script></html>');
    const { ticket, complete } = await env.upload(agent, html);
    expect(complete!.status).toBe(422);
    expect(complete!.body.detail).toMatch(/does not look like a valid image\/png/);
    // rejected row + object are removed
    expect((await request(env.app).get(`/api/v1/media/${ticket.body.data.mediaId}`)).status).toBe(404);
    const files = fs.readdirSync(env.uploadDir, { recursive: true }).filter((f) => String(f).endsWith('.png'));
    expect(files.every((f) => !fs.readFileSync(path.join(env.uploadDir, String(f))).toString().includes('<script>'))).toBe(true);
  });

  it('rejects tampered or mismatched upload URLs', async () => {
    const { agent } = await env.signup('Trudy');
    const t = await agent.post('/api/v1/media').send({ kind: 'photo', title: 'x', mimeType: 'image/png', sizeBytes: PNG.length });
    const { url } = t.body.data.upload;
    const tampered = await agent.put(url.replace(/token=[^&]+/, 'token=bogus')).set('Content-Type', 'image/png').send(PNG);
    expect(tampered.status).toBe(403);
    const wrongType = await agent.put(url).set('Content-Type', 'text/html').send(PNG);
    expect(wrongType.status).toBe(400);
  });

  it('requires auth to upload and enforces ownership on edit/delete', async () => {
    expect((await request(env.app).post('/api/v1/media').send({})).status).toBe(401);
    const owner = await env.signup('Owner');
    const other = await env.signup('Other');
    const { complete } = await env.upload(owner.agent);
    const id = complete!.body.data.id;
    expect((await other.agent.patch(`/api/v1/media/${id}`).send({ title: 'mine now' })).status).toBe(403);
    expect((await other.agent.delete(`/api/v1/media/${id}`)).status).toBe(403);
    const edited = await owner.agent.patch(`/api/v1/media/${id}`).send({ title: 'Renamed' });
    expect(edited.body.data.title).toBe('Renamed');
  });
});

describe('engagement', () => {
  it('likes are idempotent with accurate counters and likedByMe', async () => {
    const author = await env.signup('Lena');
    const fan = await env.signup('Fan');
    const { complete } = await env.upload(author.agent);
    const id = complete!.body.data.id;

    const [a, b] = await Promise.all([fan.agent.post(`/api/v1/media/${id}/like`), fan.agent.post(`/api/v1/media/${id}/like`)]);
    expect(a.body.data.liked).toBe(true);
    expect(b.body.data.liked).toBe(true);
    const view = await fan.agent.get(`/api/v1/media/${id}`);
    expect(view.body.data).toMatchObject({ likeCount: 1, likedByMe: true });
    expect((await author.agent.get(`/api/v1/media/${id}`)).body.data.likedByMe).toBe(false);

    const un = await fan.agent.delete(`/api/v1/media/${id}/like`);
    expect(un.body.data).toEqual({ liked: false, likeCount: 0 });
    const again = await fan.agent.delete(`/api/v1/media/${id}/like`);
    expect(again.body.data.likeCount).toBe(0);
  });

  it('comments: add, list, canDelete permissions, delete updates counter', async () => {
    const author = await env.signup('Cora');
    const commenter = await env.signup('Cid');
    const stranger = await env.signup('Stan');
    const { complete } = await env.upload(author.agent);
    const id = complete!.body.data.id;

    const empty = await commenter.agent.post(`/api/v1/media/${id}/comments`).send({ body: '   ' });
    expect(empty.status).toBe(400);
    const c = await commenter.agent.post(`/api/v1/media/${id}/comments`).send({ body: 'Lovely!' });
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ body: 'Lovely!', canDelete: true, author: { handle: 'cid' } });

    const asStranger = await stranger.agent.get(`/api/v1/media/${id}/comments`);
    expect(asStranger.body.data[0].canDelete).toBe(false);
    const asOwner = await author.agent.get(`/api/v1/media/${id}/comments`);
    expect(asOwner.body.data[0].canDelete).toBe(true);
    expect((await author.agent.get(`/api/v1/media/${id}`)).body.data.commentCount).toBe(1);

    expect((await stranger.agent.delete(`/api/v1/comments/${c.body.data.id}`)).status).toBe(403);
    expect((await author.agent.delete(`/api/v1/comments/${c.body.data.id}`)).status).toBe(204);
    expect((await author.agent.get(`/api/v1/media/${id}`)).body.data.commentCount).toBe(0);
  });

  it('deleting media cascades likes/comments and removes the file', async () => {
    const author = await env.signup('Dee');
    const { complete } = await env.upload(author.agent);
    const m = complete!.body.data;
    await author.agent.post(`/api/v1/media/${m.id}/like`);
    await author.agent.post(`/api/v1/media/${m.id}/comments`).send({ body: 'first' });
    const filePath = path.join(env.uploadDir, m.url.replace('/api/v1/files/', ''));
    expect(fs.existsSync(filePath)).toBe(true);

    expect((await author.agent.delete(`/api/v1/media/${m.id}`)).status).toBe(204);
    expect((await request(env.app).get(`/api/v1/media/${m.id}`)).status).toBe(404);
    await new Promise((r) => setTimeout(r, 50)); // event-driven file cleanup
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

describe('feeds & pagination', () => {
  it('paginates newest-first with cursors and filters by kind/author', async () => {
    const { agent } = await env.signup('Paige');
    for (let i = 0; i < 5; i++) await env.upload(agent, PNG, { title: `p${i}` });
    const page1 = await request(env.app).get('/api/v1/media?author=paige&limit=2');
    expect(page1.body.data.map((m: { title: string }) => m.title)).toEqual(['p4', 'p3']);
    const page2 = await request(env.app).get(`/api/v1/media?author=paige&limit=2&cursor=${page1.body.meta.nextCursor}`);
    expect(page2.body.data.map((m: { title: string }) => m.title)).toEqual(['p2', 'p1']);
    const page3 = await request(env.app).get(`/api/v1/media?author=paige&limit=2&cursor=${page2.body.meta.nextCursor}`);
    expect(page3.body.data).toHaveLength(1);
    expect(page3.body.meta.nextCursor).toBeNull();

    expect((await request(env.app).get('/api/v1/media?kind=video&author=paige')).body.data).toHaveLength(0);
    expect((await request(env.app).get('/api/v1/media?cursor=garbage')).status).toBe(400);
    expect((await request(env.app).get('/api/v1/media?limit=500')).status).toBe(400);
  });

  it('following feed requires auth and only shows followed creators', async () => {
    expect((await request(env.app).get('/api/v1/media?feed=following')).status).toBe(401);
    const reader = await env.signup('Reader');
    const creator = await env.signup('Creator');
    await env.upload(creator.agent, PNG, { title: 'from creator' });
    expect((await reader.agent.get('/api/v1/media?feed=following')).body.data).toHaveLength(0);
    await reader.agent.post(`/api/v1/users/${creator.user.handle}/follow`);
    const feed = await reader.agent.get('/api/v1/media?feed=following');
    expect(feed.body.data.map((m: { title: string }) => m.title)).toEqual(['from creator']);
  });
});

describe('maintenance', () => {
  it('sweeps stale pending uploads', async () => {
    const { agent } = await env.signup('Sweep');
    await agent.post('/api/v1/media').send({ kind: 'photo', title: 'abandoned', mimeType: 'image/png', sizeBytes: 10 });
    expect(await env.mediaService.sweepPending(-1000)).toBeGreaterThanOrEqual(1);
  });
});
