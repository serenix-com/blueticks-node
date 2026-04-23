import { describe, it, expect } from "vitest";
import { Blueticks } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function baseMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "msg_1",
    to: "+15551230001",
    from: null,
    text: "hello",
    media_url: null,
    status: "scheduled",
    send_at: null,
    created_at: "2026-04-23T10:00:00Z",
    sent_at: null,
    delivered_at: null,
    read_at: null,
    failed_at: null,
    failure_reason: null,
    ...overrides,
  };
}

describe("client.messages.send", () => {
  it("POSTs to /v1/messages with body and returns typed Message", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ to: "+15551230001", text: "hello" });
      expect(req.headers.get("idempotency-key")).toBeNull();
      return jsonResponse(200, baseMessage());
    });
    const m = await c.messages.send({ to: "+15551230001", text: "hello" });
    expect(m.id).toBe("msg_1");
    expect(m.status).toBe("scheduled");
  });

  it("sets Idempotency-Key header when idempotencyKey is provided", async () => {
    const c = mkClient(async (req) => {
      expect(req.headers.get("idempotency-key")).toBe("abc-123");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).not.toHaveProperty("idempotencyKey");
      return jsonResponse(200, baseMessage());
    });
    await c.messages.send({ to: "+15551230001", text: "hi", idempotencyKey: "abc-123" });
  });

  it("passes media_url and send_at on the wire as snake_case", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body["media_url"]).toBe("https://example.com/a.png");
      expect(body["send_at"]).toBe("2026-04-23T12:00:00Z");
      return jsonResponse(200, baseMessage({ media_url: "https://example.com/a.png", send_at: "2026-04-23T12:00:00Z" }));
    });
    await c.messages.send({
      to: "+15551230001",
      media_url: "https://example.com/a.png",
      send_at: "2026-04-23T12:00:00Z",
    });
  });
});

describe("client.messages.get", () => {
  it("GETs /v1/messages/:id", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/msg_xyz");
      return jsonResponse(200, baseMessage({ id: "msg_xyz", status: "delivered" }));
    });
    const m = await c.messages.get("msg_xyz");
    expect(m.id).toBe("msg_xyz");
    expect(m.status).toBe("delivered");
  });
});
