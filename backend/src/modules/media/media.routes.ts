import { Router } from 'express';
import { z } from 'zod';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { parse } from '../../lib/errors.js';
import { pageQuery } from '../../lib/pagination.js';
import { mediaKindEnum } from '../../db/schema.js';
import type { MediaService } from './media.service.js';

const idParams = z.object({ id: z.coerce.number().int().positive({ error: 'Invalid id' }) });
const kind = z.enum(mediaKindEnum.enumValues);
const title = z.string().trim().min(1, 'Title is required').max(120, 'Title must be at most 120 characters');
const description = z.string().trim().max(2000, 'Description must be at most 2000 characters').nullish();

const listQuery = pageQuery.extend({
  kind: kind.optional(),
  author: z.string().trim().max(40).optional(),
  feed: z.literal('following').optional(),
});

const createBody = z.object({
  kind,
  title,
  description,
  mimeType: z.string().trim().toLowerCase().max(100),
  sizeBytes: z.number().int().positive('File is empty'),
});

const updateBody = z
  .object({ title: title.optional(), description })
  .refine((v) => v.title !== undefined || v.description !== undefined, 'Nothing to update');

const commentBody = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment must be at most 2000 characters'),
});

export function mediaRoutes(service: MediaService, limiters: RateLimiters): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const q = parse(listQuery, req.query);
    const { data, nextCursor } = await service.list(q, req.user);
    res.json({ data, meta: { nextCursor } });
  });

  router.post('/', requireAuth, limiters.upload, async (req, res) => {
    const input = parse(createBody, req.body);
    res.status(201).json({ data: await service.createUpload(currentUser(req), input) });
  });

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    res.json({ data: await service.get(id, req.user) });
  });

  router.post('/:id/complete', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    res.json({ data: await service.complete(currentUser(req), id) });
  });

  router.patch('/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    res.json({ data: await service.update(currentUser(req), id, parse(updateBody, req.body)) });
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    await service.remove(currentUser(req), id);
    res.status(204).end();
  });

  router.post('/:id/like', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    res.json({ data: await service.setLike(currentUser(req), id, true) });
  });

  router.delete('/:id/like', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    res.json({ data: await service.setLike(currentUser(req), id, false) });
  });

  router.get('/:id/comments', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { data, nextCursor } = await service.listComments(id, parse(pageQuery, req.query), req.user);
    res.json({ data, meta: { nextCursor } });
  });

  router.post('/:id/comments', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { body } = parse(commentBody, req.body);
    res.status(201).json({ data: await service.addComment(currentUser(req), id, body) });
  });

  return router;
}

export function commentRoutes(service: MediaService): Router {
  const router = Router();
  router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    await service.deleteComment(currentUser(req), id);
    res.status(204).end();
  });
  return router;
}
