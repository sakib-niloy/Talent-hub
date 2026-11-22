import type { Envelope, ProblemDetails } from "./types";
import { wakingStore } from "./waking";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly errors: ProblemDetails["errors"];
  readonly requestId?: string;

  constructor(problem: ProblemDetails) {
    const detail = problem.detail || problem.title || defaultMessage(problem.status);
    super(detail);
    this.name = "ApiError";
    this.status = problem.status;
    this.detail = detail;
    this.errors = problem.errors;
    this.requestId = problem.requestId;
  }
}

function defaultMessage(status: number) {
  if (status === 0) return "Can't reach the server. Check your connection and try again.";
  if (status === 401) return "Please sign in to continue.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many requests. Please slow down and try again shortly.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Request failed.";
}

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong.";
}

let onUnauthorized: (() => void) | null = null;
/** Registered by the app providers so a 401 anywhere clears the cached session. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Don't trigger the global unauthorized handler (used by /auth/me). */
  silent401?: boolean;
}

// Cold-start backoff: ~50s total before giving up.
const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000, 10000, 12000, 12000];

function buildUrl(path: string, query?: Query) {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

function isProblem(res: Response) {
  return (res.headers.get("content-type") ?? "").includes("problem+json");
}

/**
 * Is this failure the API waking up (or a proxy hiccup) rather than a real error?
 * Idempotent requests retry on any gateway error; mutations only when the request
 * certainly never reached the app (network failure, 502, non-API 503).
 */
function shouldRetry(method: string, res: Response | null) {
  const idempotent = method === "GET";
  if (!res) return true; // network error / connection refused
  if (res.status === 502) return true;
  if (res.status === 503) return !isProblem(res); // API-generated 503s are real answers
  if (res.status === 504) return idempotent;
  return false;
}

async function parseProblem(res: Response): Promise<ProblemDetails> {
  try {
    const body = (await res.json()) as Partial<ProblemDetails> & { error?: string };
    return {
      ...body,
      status: res.status,
      detail: body.detail ?? body.error,
    };
  } catch {
    return { status: res.status };
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const method = options.method ?? "GET";
  const url = buildUrl(path, options.query);
  const hasBody = options.body !== undefined;
  const init: RequestInit = {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json, application/problem+json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  };

  let attempt = 0;
  let markedWaking = false;
  try {
    for (;;) {
      let res: Response | null = null;
      try {
        res = await fetch(url, init);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw err;
        res = null;
      }

      if (res && res.ok) {
        if (res.status === 204) return { data: undefined as T };
        const text = await res.text();
        return (text ? JSON.parse(text) : { data: undefined }) as Envelope<T>;
      }

      if (shouldRetry(method, res) && attempt < RETRY_DELAYS_MS.length) {
        if (!markedWaking) {
          markedWaking = true;
          wakingStore.begin();
        }
        await sleep(RETRY_DELAYS_MS[attempt], options.signal);
        attempt += 1;
        continue;
      }

      if (!res) throw new ApiError({ status: 0 });
      const problem = await parseProblem(res);
      if (res.status === 401 && !options.silent401) onUnauthorized?.();
      throw new ApiError(problem);
    }
  } finally {
    if (markedWaking) wakingStore.end();
  }
}
