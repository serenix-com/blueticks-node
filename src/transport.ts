// src/transport.ts
import type { ZodType } from "zod";
import { APIConnectionError, errorFromEnvelope } from "./errors";

const RETRIABLE_STATUS = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "DELETE", "PATCH", "PUT"]);
// PATCH is not strictly idempotent per RFC 5789 but most REST APIs treat partial
// updates as idempotent in practice. Matches Stripe/OpenAI convention.
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8000;

export interface TransportInit {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  userAgentSuffix: string | null;
  version: string;
  fetch?: typeof fetch;
}

export interface RequestOptions<T> {
  method: string;
  path: string;
  schema: ZodType<T>;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class Transport {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly userAgent: string;
  private readonly fetchFn: typeof fetch;

  constructor(init: TransportInit) {
    this.apiKey = init.apiKey;
    this.baseUrl = init.baseUrl.replace(/\/$/, "");
    this.timeout = init.timeout;
    this.maxRetries = init.maxRetries;
    this.userAgent = init.userAgentSuffix
      ? `blueticks-node/${init.version} ${init.userAgentSuffix}`
      : `blueticks-node/${init.version}`;
    this.fetchFn = init.fetch ?? globalThis.fetch;
  }

  async request<T>(opts: RequestOptions<T>): Promise<T> {
    const method = opts.method.toUpperCase();
    const isIdempotent = IDEMPOTENT_METHODS.has(method) || opts.idempotencyKey !== undefined;

    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      "user-agent": this.userAgent,
      accept: "application/json",
    };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

    const init: RequestInit = {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    };

    let attempt = 0;
    for (;;) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const signal = opts.signal
        ? anySignal([opts.signal, controller.signal])
        : controller.signal;

      let response: Response;
      try {
        response = await this.fetchFn(url, { ...init, signal });
      } catch (exc) {
        // Do not retry if the caller deliberately aborted.
        if (opts.signal?.aborted) {
          throw exc as Error;
        }
        if (attempt < this.maxRetries) {
          await sleep(backoff(attempt, null));
          attempt++;
          continue;
        }
        throw new APIConnectionError({
          message: `connection error: ${(exc as Error).message}`,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status >= 200 && response.status < 300) {
        if (response.status === 204 || response.headers.get("content-length") === "0") {
          return opts.schema.parse(undefined);
        }
        const json = (await response.json()) as unknown;
        return opts.schema.parse(json);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => "");
      }

      const retryAfter = response.status === 429 ? parseRetryAfter(response) : null;
      const retriable = RETRIABLE_STATUS.has(response.status) && isIdempotent && attempt < this.maxRetries;
      if (retriable) {
        await sleep(backoff(attempt, retryAfter));
        attempt++;
        continue;
      }

      throw errorFromEnvelope({
        statusCode: response.status,
        body,
        response,
        retryAfter,
      });
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, this.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number, retryAfter: number | null): number {
  if (retryAfter !== null) return Math.max(0, retryAfter * 1000);
  const base = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_CAP_MS);
  const jitter = Math.random() * BACKOFF_BASE_MS;
  return base + jitter;
}

function parseRetryAfter(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
