// HTTP errors rendered as RFC 9457 problem+json by the error handler.
import { STATUS_CODES } from 'node:http';
import { z } from 'zod';

export interface FieldError {
  path: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly errors?: FieldError[],
    public readonly headers?: Record<string, string>
  ) {
    super(detail);
    this.name = 'HttpError';
  }
}

export const badRequest = (detail: string, errors?: FieldError[]) => new HttpError(400, detail, errors);
export const unauthorized = (detail = 'Authentication required') => new HttpError(401, detail);
export const forbidden = (detail = 'You do not have permission to do that') => new HttpError(403, detail);
export const notFound = (detail = 'Not found') => new HttpError(404, detail);
export const conflict = (detail: string) => new HttpError(409, detail);
export const unprocessable = (detail: string) => new HttpError(422, detail);
export const unavailable = (detail: string) => new HttpError(503, detail);

export const problemBody = (status: number, detail: string, requestId?: string, errors?: FieldError[]) => ({
  type: 'about:blank',
  title: STATUS_CODES[status] ?? 'Error',
  status,
  detail,
  ...(requestId ? { requestId } : {}),
  ...(errors?.length ? { errors } : {}),
});

/** Parse untrusted input; throws a 400 with field errors on failure. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  throw badRequest(errors[0]?.message ?? 'Invalid request', errors);
}
