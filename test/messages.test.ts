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
    error: { code: "authentication_required", message: "bad key", requestId: "req_a" },
  });
}

function baseChatMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: "true_120363000000000000@g.us_3EB0XXXXXXXXXXXXXXXX",
    chatId: "120363000000000000@g.us",
    from: "15551230001@c.us",
    timestamp: "2026-04-23T10:00:00Z",
    text: "hello",
    type: "chat",
    fromMe: false,
    ack: 3,
    mediaUrl: null,
    caption: null,
    filename: null,
    ...overrides,
  };
}

describe("client.messages.list", () => {
  it("encodes query params (incl. chatId) and returns Page<ChatMessage>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages");
      expect(url.searchParams.get("order")).toBe("asc");
      expect(url.searchParams.get("query")).toBe("invoice");
      expect(url.searchParams.get("since")).toBe("2026-04-01T00:00:00Z");
      expect(url.searchParams.get("until")).toBe("2026-04-30T00:00:00Z");
      expect(url.searchParams.get("messageTypes")).toBe("image,document");
      expect(url.searchParams.get("chatId")).toBe("120363000000000000@g.us");
      return jsonResponse(200, {
        data: [baseChatMessage()],
        has_more: false,
        next_cursor: null,
      });
    });
    const page = await c.messages.list({
      order: "asc",
      query: "invoice",
      since: "2026-04-01T00:00:00Z",
      until: "2026-04-30T00:00:00Z",
      messageTypes: ["image", "document"],
      chatId: "120363000000000000@g.us",
    });
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.key).toContain("3EB0");
    expect(page.data[0]?.fromMe).toBe(false);
    expect(page.has_more).toBe(false);
  });

  it("omits order by default and omits chatId when not provided", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages");
      expect(url.searchParams.has("order")).toBe(false);
      expect(url.searchParams.has("chatId")).toBe(false);
      return jsonResponse(200, { data: [], has_more: false, next_cursor: null });
    });
    const page = await c.messages.list();
    expect(page.data).toHaveLength(0);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

function baseSentMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: null,
    key: "true_120363000000000000@g.us_3EB0XXXXXXXXXXXXXXXX",
    to: "120363000000000000@g.us",
    type: "text",
    text: "hello",
    mediaUrl: null,
    mediaKind: null,
    pollQuestion: null,
    status: "confirmed",
    sendAt: null,
    createdAt: "2026-04-23T10:00:00Z",
    confirmedAt: "2026-04-23T10:00:00Z",
    receivedAt: null,
    readAt: null,
    playedAt: null,
    failedAt: null,
    failureReason: null,
    ...overrides,
  };
}

describe("client.messages.send (text variant)", () => {
  it("POSTs to /v1/messages/:id with type+text and returns typed message", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/c1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ type: "text", text: "hello" });
      return jsonResponse(201, baseSentMessage({ to: "c1" }));
    });
    const m = await c.messages.send("c1", { type: "text", text: "hello" });
    expect(m.type).toBe("text");
    expect(m.status).toBe("confirmed");
    expect(typeof m.key).toBe("string");
  });

  it("sets Idempotency-Key header when idempotencyKey is provided", async () => {
    const c = mkClient(async (req) => {
      expect(req.headers.get("idempotency-key")).toBe("abc-123");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).not.toHaveProperty("idempotencyKey");
      return jsonResponse(201, baseSentMessage({ to: "c1" }));
    });
    await c.messages.send(
      "c1",
      { type: "text", text: "hi" },
      { idempotencyKey: "abc-123" },
    );
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages
      .send("c1", { type: "text", text: "hi" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing from response", async () => {
    const c = mkClient(() => jsonResponse(201, {}));
    await expect(
      c.messages.send("c1", { type: "text", text: "hi" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.send (media variant)", () => {
  it("POSTs type:media with flat media fields", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/c1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "media",
        mediaUrl: "https://cdn.example.com/x.pdf",
        mediaKind: "document",
        mediaFilename: "receipt.pdf",
      });
      return jsonResponse(
        201,
        baseSentMessage({
          to: "c1",
          type: "media",
          text: null,
          mediaUrl: "https://cdn.example.com/x.pdf",
          mediaKind: "document",
        }),
      );
    });
    const m = await c.messages.send("c1", {
      type: "media",
      mediaUrl: "https://cdn.example.com/x.pdf",
      mediaKind: "document",
      mediaFilename: "receipt.pdf",
    });
    expect(m.type).toBe("media");
    expect(m.mediaKind).toBe("document");
  });

  it("forwards flat camelCase wire fields (mediaBase64, replyTo)", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "media",
        mediaBase64: "AAAA",
        mediaKind: "image",
        mediaFilename: "x.png",
        replyTo: "msg_abc",
      });
      return jsonResponse(
        201,
        baseSentMessage({ to: "c1", type: "media", text: null, mediaKind: "image" }),
      );
    });
    await c.messages.send("c1", {
      type: "media",
      mediaBase64: "AAAA",
      mediaKind: "image",
      mediaFilename: "x.png",
      replyTo: "msg_abc",
    });
  });
});

describe("client.messages.send (poll variant)", () => {
  it("POSTs type:poll with flat poll fields", async () => {
    const c = mkClient(async (req) => {
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        type: "poll",
        pollQuestion: "Pizza?",
        pollOptions: ["Yes", "No"],
      });
      return jsonResponse(
        201,
        baseSentMessage({
          to: "c1",
          type: "poll",
          text: null,
          pollQuestion: "Pizza?",
        }),
      );
    });
    const m = await c.messages.send("c1", {
      type: "poll",
      pollQuestion: "Pizza?",
      pollOptions: ["Yes", "No"],
    });
    expect(m.type).toBe("poll");
    expect(m.pollQuestion).toBe("Pizza?");
  });
});

describe("client.messages.get", () => {
  it("GETs single message by waMessageKey", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/k1");
      expect(new URL(req.url).searchParams.has("chatId")).toBe(false);
      return jsonResponse(200, baseChatMessage({ key: "k1" }));
    });
    const m = await c.messages.get("k1");
    expect(m.key).toBe("k1");
    expect(m.text).toBe("hello");
  });

  it("forwards optional chatId query param", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages/k1");
      expect(url.searchParams.get("chatId")).toBe("c1@c.us");
      return jsonResponse(200, baseChatMessage({ key: "k1" }));
    });
    const m = await c.messages.get("k1", { chatId: "c1@c.us" });
    expect(m.key).toBe("k1");
  });
});

describe("client.messages.getAck", () => {
  it("returns typed MessageAck", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/ack/k1");
      return jsonResponse(200, { ack: 3 });
    });
    const r = await c.messages.getAck("k1");
    expect(r.ack).toBe(3);
  });

  it("accepts null ack and forwards chatId query param", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.get("chatId")).toBe("c1@c.us");
      return jsonResponse(200, { ack: null });
    });
    const r = await c.messages.getAck("k1", { chatId: "c1@c.us" });
    expect(r.ack).toBeNull();
  });

  it("raises ValidationError when ack is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.getAck("k1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.react", () => {
  it("POSTs the body and returns OkResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/reactions/k1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ emoji: "👍" });
      return jsonResponse(200, { ok: true });
    });
    const r = await c.messages.react("k1", { emoji: "👍" });
    expect(r.ok).toBe(true);
  });

  it("forwards optional chatId query param", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).searchParams.get("chatId")).toBe("c1@c.us");
      return jsonResponse(200, { ok: true });
    });
    await c.messages.react("k1", { emoji: "👍" }, { chatId: "c1@c.us" });
  });
});

describe("client.messages.loadOlder", () => {
  it("returns typed LoadOlderMessagesResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/load_older/c1");
      return jsonResponse(200, { totalMessages: 1500, added: 200, canLoadMore: true });
    });
    const r = await c.messages.loadOlder("c1");
    expect(r.totalMessages).toBe(1500);
    expect(r.added).toBe(200);
    expect(r.canLoadMore).toBe(true);
  });

  it("accepts null totalMessages and added", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { totalMessages: null, added: null, canLoadMore: false }),
    );
    const r = await c.messages.loadOlder("c1");
    expect(r.totalMessages).toBeNull();
    expect(r.canLoadMore).toBe(false);
  });

  it("raises ValidationError when canLoadMore is missing", async () => {
    const c = mkClient(() => jsonResponse(200, { totalMessages: 1, added: 1 }));
    await expect(c.messages.loadOlder("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.getMedia", () => {
  it("returns typed ChatMedia", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/media/k1");
      return jsonResponse(200, {
        url: "https://cdn.example/x.png",
        mimetype: "image/png",
        filename: "x.png",
        dataBase64: null,
        originalQuality: true,
        mediaUnavailable: null,
      });
    });
    const r = await c.messages.getMedia("k1");
    expect(r.mimetype).toBe("image/png");
    expect(r.originalQuality).toBe(true);
  });

  it("forwards optional chatId query param", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.get("chatId")).toBe("c1@c.us");
      return jsonResponse(200, {
        url: null,
        mimetype: null,
        filename: null,
        dataBase64: null,
        originalQuality: null,
        mediaUnavailable: "fetching",
      });
    });
    const r = await c.messages.getMedia("k1", { chatId: "c1@c.us" });
    expect(r.mediaUnavailable).toBe("fetching");
  });
});

describe("client.messages.batchAcks", () => {
  it("POSTs messageKeys and returns BatchMessageAcksResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/acks");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ messageKeys: ["k1", "k2"] });
      return jsonResponse(200, {
        data: [
          { key: "k1", ack: 3 },
          { key: "k2", ack: 1 },
        ],
      });
    });
    const r = await c.messages.batchAcks({ messageKeys: ["k1", "k2"] });
    expect(r.data).toHaveLength(2);
    expect(r.data[0]?.key).toBe("k1");
    expect(r.data[0]?.ack).toBe(3);
    expect(r.data[1]?.ack).toBe(1);
  });

  it("raises ValidationError when data is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.messages.batchAcks({ messageKeys: ["k1"] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages.batchAcks({ messageKeys: ["k1"] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.messages.listPinned", () => {
  it("returns typed Page<PinnedMessage>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/pinned/c1");
      return jsonResponse(200, {
        data: [{ key: "k1", chatId: "c1", text: "pinned note" }],
        has_more: false,
        next_cursor: null,
      });
    });
    const page = await c.messages.listPinned("c1");
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.key).toBe("k1");
    expect(page.data[0]?.text).toBe("pinned note");
  });

  it("accepts null text", async () => {
    const c = mkClient(() =>
      jsonResponse(200, {
        data: [{ key: "k1", chatId: "c1", text: null }],
        has_more: false,
        next_cursor: null,
      }),
    );
    const page = await c.messages.listPinned("c1");
    expect(page.data[0]?.text).toBeNull();
  });

  it("raises ValidationError when data is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.listPinned("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});
