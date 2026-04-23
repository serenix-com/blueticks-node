// src/webhooks.ts — offline webhook signature verification helper.
import { createHmac, timingSafeEqual } from "node:crypto";
import { BluetickError } from "./errors";
import { WebhookEventSchema, type WebhookEvent } from "./types/webhooks";

/**
 * Raised by {@link verifyWebhook} when signature verification fails.
 *
 * The `reason` is attached as the error message; the class is a subclass of
 * {@link BluetickError} so callers catching `BluetickError` pick it up too.
 */
export class WebhookVerificationError extends BluetickError {
  constructor(reason: string) {
    super({
      statusCode: null,
      code: "webhook_verification_failed",
      message: reason,
      requestId: null,
      _rawMessage: true,
    });
    this.name = "WebhookVerificationError";
  }
}

const DEFAULT_TOLERANCE_SECONDS = 300;

function headerLookup(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const direct = headers[name];
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct) && direct.length > 0) return direct[0] ?? null;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      if (typeof v === "string") return v;
      if (Array.isArray(v) && v.length > 0) return v[0] ?? null;
    }
  }
  return null;
}

export interface VerifyWebhookParams {
  /** Raw JSON payload (string or Buffer) — must match what was signed byte-for-byte. */
  payload: string | Buffer;
  /** Request headers (case-insensitive lookup). */
  headers: Record<string, string | string[] | undefined>;
  /** Signing secret returned from `webhooks.create()` / `webhooks.rotateSecret()`. */
  secret: string;
  /** Replay-window in seconds. Default 300 (5 min). */
  tolerance?: number;
}

/**
 * Verify a webhook request and return the parsed event.
 *
 * Throws {@link WebhookVerificationError} for any verification failure:
 * missing headers, expired timestamp, invalid signature scheme, or signature mismatch.
 */
export function verifyWebhook(params: VerifyWebhookParams): WebhookEvent {
  const { payload, headers, secret } = params;
  const tolerance = params.tolerance ?? DEFAULT_TOLERANCE_SECONDS;

  const timestampRaw = headerLookup(headers, "Blueticks-Webhook-Timestamp");
  const signatureRaw = headerLookup(headers, "Blueticks-Webhook-Signature");
  if (!timestampRaw || !signatureRaw) {
    throw new WebhookVerificationError("missing required headers");
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    throw new WebhookVerificationError("invalid timestamp");
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) {
    throw new WebhookVerificationError("expired timestamp");
  }

  const payloadStr = typeof payload === "string" ? payload : payload.toString("utf8");
  const signed = `${timestamp}.${payloadStr}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");

  // Signature header format: "v1=<hex>" (may be comma-separated for multi-scheme support).
  const parts = signatureRaw.split(",").map((s) => s.trim());
  let supplied: string | null = null;
  for (const p of parts) {
    if (p.startsWith("v1=")) {
      supplied = p.slice(3);
      break;
    }
  }
  if (!supplied) {
    throw new WebhookVerificationError("invalid_signature: missing v1 scheme");
  }

  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(expected, "hex");
    b = Buffer.from(supplied, "hex");
  } catch {
    throw new WebhookVerificationError("invalid_signature: malformed hex");
  }
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookVerificationError("invalid_signature: mismatch");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadStr);
  } catch (exc) {
    throw new WebhookVerificationError(`invalid_payload: ${(exc as Error).message}`);
  }
  return WebhookEventSchema.parse(parsed);
}
