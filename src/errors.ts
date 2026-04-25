export { ZodError as ValidationError } from "zod";

export interface ErrorDetail {
  path: string;
  code: string;
  message: string;
}

export interface BluetickErrorInit {
  statusCode?: number | null;
  code?: string | null;
  message?: string;
  requestId?: string | null;
  response?: Response | null;
  details?: ErrorDetail[] | null;
  /** @internal — when true, `message` is used verbatim without the standard rendering wrapper. */
  _rawMessage?: boolean;
}

export class BluetickError extends Error {
  readonly statusCode: number | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly response: Response | null;
  readonly details: ErrorDetail[] | null;

  constructor(init: BluetickErrorInit = {}) {
    const statusCode = init.statusCode ?? null;
    const code = init.code ?? null;
    const message = init.message ?? "";
    const requestId = init.requestId ?? null;
    const rendered = init._rawMessage
      ? message
      : `${statusCode} ${code}: ${message} (request_id=${requestId})`;
    super(rendered);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.response = init.response ?? null;
    this.details = init.details ?? null;
  }
}

export class AuthenticationError extends BluetickError {}
export class PermissionDeniedError extends BluetickError {}
export class NotFoundError extends BluetickError {}
export class BadRequestError extends BluetickError {}
export class APIError extends BluetickError {}
export class APIConnectionError extends BluetickError {}

export interface RateLimitErrorInit extends BluetickErrorInit {
  retryAfter?: number | null;
}

export class RateLimitError extends BluetickError {
  readonly retryAfter: number | null;

  constructor(init: RateLimitErrorInit = {}) {
    super(init);
    this.retryAfter = init.retryAfter ?? null;
  }
}

type BluetickErrorCtor = new (init: BluetickErrorInit | RateLimitErrorInit) => BluetickError;

const STATUS_TO_CLASS: Record<number, BluetickErrorCtor> = {
  400: BadRequestError,
  401: AuthenticationError,
  403: PermissionDeniedError,
  404: NotFoundError,
  422: BadRequestError,
  429: RateLimitError,
};

function classForStatus(status: number): BluetickErrorCtor {
  return STATUS_TO_CLASS[status] ?? APIError;
}

export interface ErrorEnvelopeInput {
  statusCode: number;
  body: unknown;
  response: Response | null;
  retryAfter?: number | null;
}

function parseDetails(raw: unknown): ErrorDetail[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ErrorDetail[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const o = item as { path?: unknown; code?: unknown; message?: unknown };
      out.push({
        path: typeof o.path === "string" ? o.path : "",
        code: typeof o.code === "string" ? o.code : "",
        message: typeof o.message === "string" ? o.message : "",
      });
    }
  }
  return out.length > 0 ? out : null;
}

export function errorFromEnvelope(input: ErrorEnvelopeInput): BluetickError {
  const Cls = classForStatus(input.statusCode);

  if (
    typeof input.body === "object" &&
    input.body !== null &&
    "error" in input.body &&
    typeof (input.body as { error: unknown }).error === "object" &&
    (input.body as { error: unknown }).error !== null
  ) {
    const env = (input.body as {
      error: { code?: unknown; message?: unknown; request_id?: unknown; details?: unknown };
    }).error;
    if (typeof env.code === "string") {
      const init: RateLimitErrorInit = {
        statusCode: input.statusCode,
        code: env.code,
        message: typeof env.message === "string" ? env.message : "",
        requestId: typeof env.request_id === "string" ? env.request_id : null,
        response: input.response,
        retryAfter: input.retryAfter ?? null,
        details: parseDetails(env.details),
      };
      return new Cls(init) as BluetickError;
    }
  }

  // Fallback for non-envelope bodies — use raw message verbatim (truncated ≤ 207 chars + "..." ≤ 210).
  const raw = typeof input.body === "string" ? input.body : JSON.stringify(input.body);
  const truncated = raw.length > 207 ? `${raw.slice(0, 207)}...` : raw;
  const init: RateLimitErrorInit = {
    statusCode: input.statusCode,
    code: null,
    message: truncated,
    requestId: null,
    response: input.response,
    retryAfter: input.retryAfter ?? null,
    _rawMessage: true,
  };
  return new Cls(init) as BluetickError;
}
