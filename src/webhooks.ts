import { createHmac, timingSafeEqual } from "node:crypto";
import { BluetickError } from "./errors";
import { WebhookEventSchema, type WebhookEvent } from "./types/webhooks";

/** Default maximum age (and clock skew) of a delivery timestamp, in seconds. */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

/** Raised by {@link verifyWebhook} when a delivery cannot be trusted. */
export class WebhookVerificationError extends BluetickError {
  constructor(reason: string) {
    super({ statusCode: null, code: "webhook_verification_failed", message: reason, _rawMessage: true });
  }
}

export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;

export interface VerifyWebhookOptions {
  /** Max age of the timestamp, in seconds, in either direction. Default 300. */
  tolerance?: number;
  /** Clock in epoch milliseconds. Defaults to `Date.now`; for tests. */
  now?: () => number;
}

function lookup(headers: WebhookHeaders, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted) continue;
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined || first === "" ? undefined : first;
  }
  return undefined;
}

function suppliedV1(signature: string): string | undefined {
  for (const part of signature.split(",")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("v1=")) return trimmed.slice(3);
  }
  return undefined;
}

/**
 * Verify a webhook delivery and return the parsed event.
 *
 * Pass the RAW request body (string or bytes), not re-serialized JSON. The
 * signature is `v1=` + hex HMAC-SHA256 of `${timestamp}.${rawBody}` keyed with
 * the webhook's signing secret, compared in constant time. Throws
 * {@link WebhookVerificationError} on missing headers, a stale or skewed
 * timestamp, a bad signature, or a body that is not a JSON event.
 */
export function verifyWebhook(
  payload: string | Uint8Array,
  headers: WebhookHeaders,
  secret: string,
  options: VerifyWebhookOptions = {},
): WebhookEvent {
  const tolerance = options.tolerance ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const nowMs = (options.now ?? Date.now)();

  const timestamp = lookup(headers, "Blueticks-Webhook-Timestamp");
  const signature = lookup(headers, "Blueticks-Webhook-Signature");
  if (!timestamp || !signature) throw new WebhookVerificationError("missing required headers");

  if (!/^-?\d+$/.test(timestamp)) throw new WebhookVerificationError("invalid timestamp");
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > tolerance) {
    throw new WebhookVerificationError("expired timestamp");
  }

  const supplied = suppliedV1(signature);
  if (supplied === undefined || supplied === "") {
    throw new WebhookVerificationError("invalid_signature: missing v1 scheme");
  }

  const body = typeof payload === "string" ? Buffer.from(payload, "utf8") : Buffer.from(payload);
  const expected = createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), body]))
    .digest();
  const suppliedBytes = /^[0-9a-fA-F]+$/.test(supplied) && supplied.length % 2 === 0
    ? Buffer.from(supplied, "hex")
    : Buffer.alloc(0);
  if (suppliedBytes.length !== expected.length || !timingSafeEqual(expected, suppliedBytes)) {
    throw new WebhookVerificationError("invalid_signature: mismatch");
  }

  let json: unknown;
  try {
    json = JSON.parse(body.toString("utf8"));
  } catch {
    throw new WebhookVerificationError("invalid_signature: payload not a JSON event");
  }
  const parsed = WebhookEventSchema.safeParse(json);
  if (!parsed.success) throw new WebhookVerificationError("invalid_signature: payload not a JSON event");
  return parsed.data;
}
