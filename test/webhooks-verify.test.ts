import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook, WebhookVerificationError, BluetickError } from "../src";

// Shared vector: signature computed independently with Python's hmac/hashlib
// over `${timestamp}.${body}` (the same scheme the Go, Python, Ruby and PHP SDKs verify).
const SECRET = "whsec_test";
const BODY =
  '{"id":"evt_1","type":"message.delivered","created_at":"2026-04-30T12:00:00.000Z","data":{"message_id":"msg_1"}}';
const TS = "1777550400";
const SIG = "66dc15ede7758af47e477180e4c6126efa4c13d9cdcb3ca2ebff444779925d04";
const NOW_MS = 1777550400 * 1000;

const headers = (over: Record<string, string> = {}): Record<string, string> => ({
  "Blueticks-Webhook-Timestamp": TS,
  "Blueticks-Webhook-Signature": `v1=${SIG}`,
  ...over,
});
const opts = { now: () => NOW_MS };

function expectFail(fn: () => unknown, reason: RegExp): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(WebhookVerificationError);
  expect(err).toBeInstanceOf(BluetickError);
  expect((err as WebhookVerificationError).code).toBe("webhook_verification_failed");
  expect((err as WebhookVerificationError).message).toMatch(reason);
}

describe("verifyWebhook", () => {
  it("matches the independently computed vector", () => {
    const mac = createHmac("sha256", SECRET).update(`${TS}.${BODY}`).digest("hex");
    expect(mac).toBe(SIG);
  });

  it("returns the parsed event for a valid string payload", () => {
    const evt = verifyWebhook(BODY, headers(), SECRET, opts);
    expect(evt.id).toBe("evt_1");
    expect(evt.type).toBe("message.delivered");
    expect(evt.created_at).toBe("2026-04-30T12:00:00.000Z");
    expect(evt.data).toEqual({ message_id: "msg_1" });
  });

  it("accepts a Buffer / Uint8Array payload", () => {
    expect(verifyWebhook(Buffer.from(BODY), headers(), SECRET, opts).id).toBe("evt_1");
    expect(verifyWebhook(new TextEncoder().encode(BODY), headers(), SECRET, opts).id).toBe("evt_1");
  });

  it("looks headers up case-insensitively, incl. Headers and array values", () => {
    const lower = { "blueticks-webhook-timestamp": TS, "blueticks-webhook-signature": `v1=${SIG}` };
    expect(verifyWebhook(BODY, lower, SECRET, opts).id).toBe("evt_1");
    expect(verifyWebhook(BODY, new Headers(headers()), SECRET, opts).id).toBe("evt_1");
    const arr = { "Blueticks-Webhook-Timestamp": [TS], "Blueticks-Webhook-Signature": [`v1=${SIG}`] };
    expect(verifyWebhook(BODY, arr, SECRET, opts).id).toBe("evt_1");
  });

  it("picks v1 out of a comma-separated signature header", () => {
    const h = headers({ "Blueticks-Webhook-Signature": `v0=abc, v1=${SIG}` });
    expect(verifyWebhook(BODY, h, SECRET, opts).id).toBe("evt_1");
  });

  it("rejects a wrong secret", () => {
    expectFail(() => verifyWebhook(BODY, headers(), "whsec_other", opts), /invalid_signature: mismatch/);
  });

  it("rejects a tampered body", () => {
    expectFail(() => verifyWebhook(BODY.replace("msg_1", "msg_2"), headers(), SECRET, opts), /mismatch/);
  });

  it("rejects a malformed or wrong-length signature without throwing a raw error", () => {
    for (const bad of ["v1=deadbeef", "v1=zz", `v1=${SIG}00`, `v1=${SIG.slice(0, -2)}`]) {
      expectFail(() => verifyWebhook(BODY, headers({ "Blueticks-Webhook-Signature": bad }), SECRET, opts), /mismatch/);
    }
  });

  it("rejects a header with no v1 scheme", () => {
    const h = headers({ "Blueticks-Webhook-Signature": `sha256=${SIG}` });
    expectFail(() => verifyWebhook(BODY, h, SECRET, opts), /missing v1 scheme/);
  });

  it("rejects missing headers", () => {
    expectFail(() => verifyWebhook(BODY, {}, SECRET, opts), /missing required headers/);
    expectFail(
      () => verifyWebhook(BODY, { "Blueticks-Webhook-Timestamp": TS }, SECRET, opts),
      /missing required headers/,
    );
  });

  it("rejects a non-numeric timestamp", () => {
    expectFail(
      () => verifyWebhook(BODY, headers({ "Blueticks-Webhook-Timestamp": "abc" }), SECRET, opts),
      /invalid timestamp/,
    );
  });

  it("enforces the tolerance window (default 300s, both directions)", () => {
    expect(verifyWebhook(BODY, headers(), SECRET, { now: () => NOW_MS + 300_000 }).id).toBe("evt_1");
    expectFail(() => verifyWebhook(BODY, headers(), SECRET, { now: () => NOW_MS + 301_000 }), /expired timestamp/);
    expectFail(() => verifyWebhook(BODY, headers(), SECRET, { now: () => NOW_MS - 301_000 }), /expired timestamp/);
  });

  it("honours a custom tolerance in seconds", () => {
    const later = { now: () => NOW_MS + 60_000 };
    expect(verifyWebhook(BODY, headers(), SECRET, { ...later, tolerance: 120 }).id).toBe("evt_1");
    expectFail(() => verifyWebhook(BODY, headers(), SECRET, { ...later, tolerance: 30 }), /expired timestamp/);
  });

  it("rejects a valid signature over a non-JSON-object payload", () => {
    const body = "not json";
    const sig = createHmac("sha256", SECRET).update(`${TS}.${body}`).digest("hex");
    const h = headers({ "Blueticks-Webhook-Signature": `v1=${sig}` });
    expectFail(() => verifyWebhook(body, h, SECRET, opts), /payload not a JSON event/);
  });
});
