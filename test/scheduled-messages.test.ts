import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({
    apiKey: "bt_test_x",
    baseUrl: "https://example.test",
    fetch: mockFetch(handler),
  });
}

function authErr() {
  return jsonResponse(401, {
    error: { code: "authentication_required", message: "bad key", request_id: "req_a" },
  });
}

function baseScheduledMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sm_1",
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

describe("client.scheduledMessages.create (text variant)", () => {
  it("POSTs to /v1/scheduled-messages with type+text and returns typed ScheduledMessage", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ type: "text", to: "+15551230001", text: "hello" });
      expect(req.headers.get("idempotency-key")).toBeNull();
      return jsonResponse(201, baseScheduledMessage());
    });
    const m = await c.scheduledMessages.create({
      type: "text",
      to: "+15551230001",
      text: "hello",
    });
    expect(m.id).toBe("sm_1");
    expect(m.type).toBe("text");
    expect(m.status).toBe("scheduled");
  });

  it("sets Idempotency-Key header when idempotencyKey is provided", async () => {
    const c = mkClient(async (req) => {
      expect(req.headers.get("idempotency-key")).toBe("abc-123");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).not.toHaveProperty("idempotencyKey");
      return jsonResponse(201, baseScheduledMessage());
    });
    await c.scheduledMessages.create({
      type: "text",
      to: "+15551230001",
      text: "hi",
      idempotencyKey: "abc-123",
    });
  });

  it("raises ValidationError when required field missing from response", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.scheduledMessages.create({ type: "text", to: "+15551230001", text: "hi" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.create (media variant)", () => {
  it("POSTs type:media with media object", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "media",
        to: "+15551230001",
        media: { url: "https://cdn.example.com/x.pdf", kind: "document", filename: "receipt.pdf" },
      });
      return jsonResponse(
        201,
        baseScheduledMessage({
          type: "media",
          media_url: "https://cdn.example.com/x.pdf",
          media_kind: "document",
          text: null,
        }),
      );
    });
    const m = await c.scheduledMessages.create({
      type: "media",
      to: "+15551230001",
      media: {
        url: "https://cdn.example.com/x.pdf",
        kind: "document",
        filename: "receipt.pdf",
      },
    });
    expect(m.type).toBe("media");
    expect(m.media_kind).toBe("document");
  });
});

describe("client.scheduledMessages.create (poll variant)", () => {
  it("POSTs type:poll with poll object", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "poll",
        to: "+15551230001",
        poll: { question: "Pizza?", options: ["Yes", "No"] },
      });
      return jsonResponse(
        201,
        baseScheduledMessage({ type: "poll", poll_question: "Pizza?", text: null }),
      );
    });
    const m = await c.scheduledMessages.create({
      type: "poll",
      to: "+15551230001",
      poll: { question: "Pizza?", options: ["Yes", "No"] },
    });
    expect(m.type).toBe("poll");
    expect(m.poll_question).toBe("Pizza?");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.scheduledMessages
      .create({ type: "text", to: "+15551230001", text: "hi" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });
});

describe("client.scheduledMessages.list", () => {
  it("returns paginated Page<ScheduledMessage> on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages");
      return jsonResponse(200, {
        data: [baseScheduledMessage(), baseScheduledMessage({ id: "sm_2" })],
        has_more: false,
        next_cursor: null,
      });
    });
    const result = await c.scheduledMessages.list();
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.id).toBe("sm_1");
    expect(result.data[0]!.type).toBe("text");
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });

  it("forwards chat_id / status / q filters as query params", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("chat_id")).toBe("15551230001@c.us");
      expect(url.searchParams.get("status")).toBe("queued");
      expect(url.searchParams.get("q")).toBe("hello");
      return jsonResponse(200, { data: [], has_more: false, next_cursor: null });
    });
    await c.scheduledMessages.list({
      chat_id: "15551230001@c.us",
      status: "queued",
      q: "hello",
    });
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.scheduledMessages.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.message).toContain("bad key");
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required envelope fields missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.retrieve", () => {
  it("GETs /v1/scheduled-messages/:id and returns typed model", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/sm_xyz");
      return jsonResponse(200, baseScheduledMessage({ id: "sm_xyz", status: "queued" }));
    });
    const m = await c.scheduledMessages.retrieve("sm_xyz");
    expect(typeof m.id).toBe("string");
    expect(m.id).toBe("sm_xyz");
    expect(m.status).toBe("queued");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.scheduledMessages.retrieve("sm_xyz").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.retrieve("sm_xyz")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.update", () => {
  it("PATCHes /v1/scheduled-messages/:id with body", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/sm_1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ text: "updated", send_at: "2026-06-01T12:00:00Z" });
      return jsonResponse(
        200,
        baseScheduledMessage({ text: "updated", send_at: "2026-06-01T12:00:00Z" }),
      );
    });
    const m = await c.scheduledMessages.update("sm_1", {
      text: "updated",
      send_at: "2026-06-01T12:00:00Z",
    });
    expect(m.text).toBe("updated");
    expect(m.send_at).toBe("2026-06-01T12:00:00Z");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.scheduledMessages.update("sm_1", { text: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.update("sm_1", { text: "x" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
