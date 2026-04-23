import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook, WebhookVerificationError, BluetickError } from "../src";

const SECRET = "whsec_test_secret";

function sign(payload: string, timestamp: number, secret: string = SECRET): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function samplePayload(): string {
  return JSON.stringify({
    id: "evt_1",
    type: "message.delivered",
    created_at: "2026-04-23T10:00:00Z",
    data: { message_id: "msg_1" },
  });
}

describe("verifyWebhook", () => {
  it("happy path: returns parsed event", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    const event = verifyWebhook({
      payload,
      headers: {
        "Blueticks-Webhook-Timestamp": String(ts),
        "Blueticks-Webhook-Signature": `v1=${sig}`,
      },
      secret: SECRET,
    });
    expect(event.id).toBe("evt_1");
    expect(event.type).toBe("message.delivered");
    expect(event.data["message_id"]).toBe("msg_1");
  });

  it("accepts Buffer payload", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    const event = verifyWebhook({
      payload: Buffer.from(payload, "utf8"),
      headers: {
        "Blueticks-Webhook-Timestamp": String(ts),
        "Blueticks-Webhook-Signature": `v1=${sig}`,
      },
      secret: SECRET,
    });
    expect(event.id).toBe("evt_1");
  });

  it("case-insensitive header lookup", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    const event = verifyWebhook({
      payload,
      headers: {
        "blueticks-webhook-timestamp": String(ts),
        "BLUETICKS-WEBHOOK-SIGNATURE": `v1=${sig}`,
      },
      secret: SECRET,
    });
    expect(event.id).toBe("evt_1");
  });

  it("accepts string-array header values (Node style)", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    const event = verifyWebhook({
      payload,
      headers: {
        "blueticks-webhook-timestamp": [String(ts)],
        "blueticks-webhook-signature": [`v1=${sig}`],
      },
      secret: SECRET,
    });
    expect(event.id).toBe("evt_1");
  });

  it("throws on missing timestamp header", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    expect(() =>
      verifyWebhook({
        payload,
        headers: { "Blueticks-Webhook-Signature": `v1=${sig}` },
        secret: SECRET,
      }),
    ).toThrow(WebhookVerificationError);
  });

  it("throws on missing signature header", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    expect(() =>
      verifyWebhook({
        payload,
        headers: { "Blueticks-Webhook-Timestamp": String(ts) },
        secret: SECRET,
      }),
    ).toThrow(WebhookVerificationError);
  });

  it("throws on expired timestamp (outside tolerance)", () => {
    const payload = samplePayload();
    const ts = nowSeconds() - 10_000;
    const sig = sign(payload, ts);
    const err = (() => {
      try {
        verifyWebhook({
          payload,
          headers: {
            "Blueticks-Webhook-Timestamp": String(ts),
            "Blueticks-Webhook-Signature": `v1=${sig}`,
          },
          secret: SECRET,
        });
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(WebhookVerificationError);
    expect((err as Error).message).toContain("expired");
  });

  it("throws on tampered payload", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    const tampered = payload.replace("msg_1", "msg_evil");
    expect(() =>
      verifyWebhook({
        payload: tampered,
        headers: {
          "Blueticks-Webhook-Timestamp": String(ts),
          "Blueticks-Webhook-Signature": `v1=${sig}`,
        },
        secret: SECRET,
      }),
    ).toThrow(/mismatch/);
  });

  it("throws on wrong secret", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts, "whsec_wrong");
    expect(() =>
      verifyWebhook({
        payload,
        headers: {
          "Blueticks-Webhook-Timestamp": String(ts),
          "Blueticks-Webhook-Signature": `v1=${sig}`,
        },
        secret: SECRET,
      }),
    ).toThrow(/mismatch/);
  });

  it("throws on missing v1 scheme", () => {
    const payload = samplePayload();
    const ts = nowSeconds();
    const sig = sign(payload, ts);
    expect(() =>
      verifyWebhook({
        payload,
        headers: {
          "Blueticks-Webhook-Timestamp": String(ts),
          "Blueticks-Webhook-Signature": `v2=${sig}`,
        },
        secret: SECRET,
      }),
    ).toThrow(/missing v1 scheme/);
  });

  it("throws on non-numeric timestamp", () => {
    expect(() =>
      verifyWebhook({
        payload: samplePayload(),
        headers: {
          "Blueticks-Webhook-Timestamp": "not-a-number",
          "Blueticks-Webhook-Signature": "v1=deadbeef",
        },
        secret: SECRET,
      }),
    ).toThrow(/invalid timestamp/);
  });

  it("respects custom tolerance", () => {
    const payload = samplePayload();
    const ts = nowSeconds() - 400;
    const sig = sign(payload, ts);
    // Default (300) would reject; 500 should accept.
    const event = verifyWebhook({
      payload,
      headers: {
        "Blueticks-Webhook-Timestamp": String(ts),
        "Blueticks-Webhook-Signature": `v1=${sig}`,
      },
      secret: SECRET,
      tolerance: 500,
    });
    expect(event.id).toBe("evt_1");
  });

  it("WebhookVerificationError is a BluetickError", () => {
    const err = new WebhookVerificationError("boom");
    expect(err).toBeInstanceOf(BluetickError);
    expect(err.code).toBe("webhook_verification_failed");
    expect(err.message).toBe("boom");
  });
});
