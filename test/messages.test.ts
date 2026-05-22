import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function authErr() {
  return jsonResponse(401, {
    error: { code: "authentication_required", message: "bad key", request_id: "req_a" },
  });
}

function baseMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "msg_1",
    key: null,
    to: "+15551230001",
    from: null,
    type: "text",
    text: "hello",
    media_url: null,
    media_kind: null,
    poll_question: null,
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

describe("client.messages.send (text variant)", () => {
  it("POSTs to /v1/messages with type+text and returns typed Message", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ type: "text", to: "+15551230001", text: "hello" });
      expect(req.headers.get("idempotency-key")).toBeNull();
      return jsonResponse(201, baseMessage());
    });
    const m = await c.messages.send({ type: "text", to: "+15551230001", text: "hello" });
    expect(m.id).toBe("msg_1");
    expect(m.type).toBe("text");
    expect(m.status).toBe("scheduled");
  });

  it("sets Idempotency-Key header when idempotencyKey is provided", async () => {
    const c = mkClient(async (req) => {
      expect(req.headers.get("idempotency-key")).toBe("abc-123");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).not.toHaveProperty("idempotencyKey");
      return jsonResponse(201, baseMessage());
    });
    await c.messages.send({ type: "text", to: "+15551230001", text: "hi", idempotencyKey: "abc-123" });
  });

  it("raises ValidationError when required field missing from response", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.messages.send({ type: "text", to: "+15551230001", text: "hi" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.send (media variant)", () => {
  it("POSTs type:media with media object", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "media",
        to: "+15551230001",
        media: { url: "https://cdn.example.com/x.pdf", kind: "document", filename: "receipt.pdf" },
      });
      return jsonResponse(201, baseMessage({ type: "media", media_url: "https://cdn.example.com/x.pdf", media_kind: "document", text: null }));
    });
    const m = await c.messages.send({
      type: "media",
      to: "+15551230001",
      media: { url: "https://cdn.example.com/x.pdf", kind: "document", filename: "receipt.pdf" },
    });
    expect(m.type).toBe("media");
    expect(m.media_kind).toBe("document");
  });
});

describe("client.messages.send (poll variant)", () => {
  it("POSTs type:poll with poll object", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "poll",
        to: "+15551230001",
        poll: { question: "Pizza?", options: ["Yes", "No"] },
      });
      return jsonResponse(201, baseMessage({ type: "poll", poll_question: "Pizza?", text: null }));
    });
    const m = await c.messages.send({
      type: "poll",
      to: "+15551230001",
      poll: { question: "Pizza?", options: ["Yes", "No"] },
    });
    expect(m.type).toBe("poll");
    expect(m.poll_question).toBe("Pizza?");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages
      .send({ type: "text", to: "+15551230001", text: "hi" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
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

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages.get("msg_xyz").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.get("msg_xyz")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.list", () => {
  it("GETs /v1/messages and returns Page<Message>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages");
      return jsonResponse(200, {
        data: [baseMessage()],
        has_more: false,
        next_cursor: null,
      });
    });
    const page = await c.messages.list();
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.id).toBe("msg_1");
    expect(page.has_more).toBe(false);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });
});
