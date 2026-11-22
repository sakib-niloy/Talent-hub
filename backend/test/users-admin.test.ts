import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setup, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setup();
});
afterAll(() => env.close());

describe('users & follows', () => {
  it('profile, follow/unfollow idempotency, lists and suggestions', async () => {
    const alice = await env.signup('Alice');
    const bob = await env.signup('Bob');

    expect((await alice.agent.post('/api/v1/users/alice/follow')).status).toBe(400);
    const f1 = await alice.agent.post('/api/v1/users/bob/follow');
    const f2 = await alice.agent.post('/api/v1/users/bob/follow');
    expect(f1.body.data).toEqual({ isFollowing: true, followerCount: 1 });
    expect(f2.body.data.followerCount).toBe(1);

    const profile = await alice.agent.get('/api/v1/users/bob');
    expect(profile.body.data).toMatchObject({ handle: 'bob', followerCount: 1, followingCount: 0, mediaCount: 0, isFollowing: true, isMe: false });
    expect(profile.body.data.email).toBeUndefined();
    expect((await bob.agent.get('/api/v1/users/bob')).body.data.isMe).toBe(true);

    const followers = await request(env.app).get('/api/v1/users/bob/followers');
    expect(followers.body.data.map((u: { handle: string }) => u.handle)).toEqual(['alice']);
    const following = await request(env.app).get('/api/v1/users/alice/following');
    expect(following.body.data.map((u: { handle: string }) => u.handle)).toEqual(['bob']);

    const sugg = await alice.agent.get('/api/v1/users/suggestions');
    const handles = sugg.body.data.map((u: { handle: string }) => u.handle);
    expect(handles).not.toContain('alice');
    expect(handles).not.toContain('bob');

    const un = await alice.agent.delete('/api/v1/users/bob/follow');
    expect(un.body.data).toEqual({ isFollowing: false, followerCount: 0 });
    expect((await request(env.app).get('/api/v1/users/nobody-here')).status).toBe(404);
  });

  it('updates own profile', async () => {
    const { agent } = await env.signup('Carol');
    const res = await agent.patch('/api/v1/users/me').send({ name: 'Carol D', bio: 'Painter' });
    expect(res.body.data.user).toMatchObject({ name: 'Carol D', bio: 'Painter' });
    expect((await agent.patch('/api/v1/users/me').send({ bio: 'x'.repeat(301) })).status).toBe(400);
  });
});

describe('admin', () => {
  it('is admin-only; can block (revoking sessions immediately), unblock and moderate media', async () => {
    const admin = await env.signup('Root');
    const user = await env.signup('Spammer');
    expect((await admin.agent.get('/api/v1/admin/stats')).status).toBe(403);
    await env.makeAdmin(admin.user.id);

    const stats = await admin.agent.get('/api/v1/admin/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data.users).toBeGreaterThanOrEqual(2);

    const { complete } = await env.upload(user.agent);
    const mediaId = complete!.body.data.id;

    const list = await admin.agent.get('/api/v1/admin/users?q=spam');
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ handle: 'spammer', status: 'active', mediaCount: 1 });

    expect((await admin.agent.patch(`/api/v1/admin/users/${admin.user.id}`).send({ status: 'blocked' })).status).toBe(400);
    const blocked = await admin.agent.patch(`/api/v1/admin/users/${user.user.id}`).send({ status: 'blocked' });
    expect(blocked.body.data.status).toBe('blocked');

    // existing session is revoked and signing in again is refused
    expect((await user.agent.get('/api/v1/auth/me')).status).toBe(401);
    const relogin = await request(env.app).post('/api/v1/auth/signin').send({ email: 'spammer@example.com', password: 'correct-horse-1' });
    expect(relogin.status).toBe(403);

    expect((await admin.agent.delete(`/api/v1/admin/media/${mediaId}`)).status).toBe(204);
    expect((await request(env.app).get(`/api/v1/media/${mediaId}`)).status).toBe(404);

    await admin.agent.patch(`/api/v1/admin/users/${user.user.id}`).send({ status: 'active' });
    const back = await request(env.app).post('/api/v1/auth/signin').send({ email: 'spammer@example.com', password: 'correct-horse-1' });
    expect(back.status).toBe(200);
  });
});
