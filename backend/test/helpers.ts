import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/lib/db.js';
import { LocalStorage } from '../src/lib/storage/index.js';
import { EventBus } from '../src/lib/events.js';
import { createLogger } from '../src/lib/logger.js';
import { createApp } from '../src/app.js';
import { users } from '../src/db/schema.js';
import type { AppContext } from '../src/context.js';

export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(120, 1),
]);

export async function setup(overrides: Record<string, string> = {}) {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789',
    FRONTEND_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000',
    RATE_LIMIT_AUTH: '1000',
    RATE_LIMIT_API: '10000',
    RATE_LIMIT_UPLOAD: '1000',
    LOCAL_UPLOAD_DIR: uploadDir,
    ...overrides,
  });
  const database = await createDatabase({ pgliteDir: 'memory://' });
  await database.migrate();
  const ctx: AppContext = {
    config,
    database,
    db: database.db,
    storage: new LocalStorage(uploadDir, config.JWT_SECRET),
    events: new EventBus(),
    logger: createLogger(config),
  };
  const { app, mediaService } = createApp(ctx);

  const signup = async (name: string, email = `${name.toLowerCase()}@example.com`, password = 'correct-horse-1') => {
    const agent = request.agent(app);
    const res = await agent.post('/api/v1/auth/signup').send({ name, email, password });
    if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
    return { agent, user: res.body.data.user as { id: number; handle: string; email: string } };
  };

  const makeAdmin = (id: number) => ctx.db.update(users).set({ role: 'admin' }).where(eq(users.id, id));

  /** Full 3-step upload: ticket -> PUT -> complete. */
  const upload = async (agent: request.Agent, body: Buffer = PNG, extra: Record<string, unknown> = {}) => {
    const ticket = await agent
      .post('/api/v1/media')
      .send({ kind: 'photo', title: 'Sunset', description: 'Golden hour', mimeType: 'image/png', sizeBytes: body.length, ...extra });
    if (ticket.status !== 201) return { ticket };
    const { url, headers } = ticket.body.data.upload;
    const put = await agent.put(url).set(headers).send(body);
    const complete = await agent.post(`/api/v1/media/${ticket.body.data.mediaId}/complete`);
    return { ticket, put, complete };
  };

  const close = async () => {
    await database.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  };

  return { app, ctx, mediaService, uploadDir, signup, upload, makeAdmin, close };
}

export type TestEnv = Awaited<ReturnType<typeof setup>>;
