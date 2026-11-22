// Request validation with zod. Replaces req[source] with the parsed (trimmed/normalised) data.
const { z } = require('zod');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const first = result.error.issues[0];
    return res.status(400).json({ success: false, error: first.message });
  }
  if (source === 'body') req.body = result.data;
  next();
};

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Please enter a valid email address' }).max(254));

const authSchemas = {
  signup: z.object({
    name: z
      .string({ error: 'Name is required' })
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be at most 100 characters'),
    email,
    password: z
      .string({ error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  }),
  signin: z.object({
    email,
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
  }),
};

module.exports = { validate, authSchemas };
