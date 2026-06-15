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

function baseChatMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: "true_120363000000000000@g.us_3EB0XXXXXXXXXXXXXXXX",
    chat_id: "120363000000000000@g.us",
    from: "15551230001@c.us",
    timestamp: "2026-04-23T10:00:00Z",
    text: "hello",
    type: "chat",
    from_me: false,
    ack: 3,
    media_url: null,
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
    expect(page.data[0]?.from_me).toBe(false);
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

describe("client.messages.listForChat", () => {
  it("encodes query params and returns Page<ChatMessage>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages/c1");
      expect(url.searchParams.get("order")).toBe("asc");
      expect(url.searchParams.get("query")).toBe("invoice");
      expect(url.searchParams.get("since")).toBe("2026-04-01T00:00:00Z");
      expect(url.searchParams.get("until")).toBe("2026-04-30T00:00:00Z");
      expect(url.searchParams.get("messageTypes")).toBe("image,document");
      return jsonResponse(200, { data: [baseChatMessage()], has_more: false, next_cursor: null });
    });
    const page = await c.messages.listForChat("c1", {
      order: "asc",
      query: "invoice",
      since: "2026-04-01T00:00:00Z",
      until: "2026-04-30T00:00:00Z",
      messageTypes: ["image", "document"],
    });
    expect(page.data[0]?.key).toContain("3EB0");
    expect(page.data[0]?.from_me).toBe(false);
  });

  it("omits order by default", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.has("order")).toBe(false);
      return jsonResponse(200, { data: [], has_more: false, next_cursor: null });
    });
    await c.messages.listForChat("c1");
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
  it("GETs single message", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/c1/k1");
      return jsonResponse(200, baseChatMessage({ key: "k1" }));
    });
    const m = await c.messages.get("c1", "k1");
    expect(m.key).toBe("k1");
    expect(m.text).toBe("hello");
  });
});

describe("client.messages.getAck", () => {
  it("returns typed MessageAck", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/ack/c1/k1");
      return jsonResponse(200, { ack: 3 });
    });
    const r = await c.messages.getAck("c1", "k1");
    expect(r.ack).toBe(3);
  });

  it("accepts null ack", async () => {
    const c = mkClient(() => jsonResponse(200, { ack: null }));
    const r = await c.messages.getAck("c1", "k1");
    expect(r.ack).toBeNull();
  });

  it("raises ValidationError when ack is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.getAck("c1", "k1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.react", () => {
  it("POSTs the body and returns OkResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/reactions/c1/k1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ emoji: "👍" });
      return jsonResponse(200, { ok: true });
    });
    const r = await c.messages.react("c1", "k1", { emoji: "👍" });
    expect(r.ok).toBe(true);
  });
});

describe("client.messages.loadOlder", () => {
  it("returns typed LoadOlderMessagesResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/load_older/c1");
      return jsonResponse(200, { total_messages: 1500, added: 200, can_load_more: true });
    });
    const r = await c.messages.loadOlder("c1");
    expect(r.total_messages).toBe(1500);
    expect(r.added).toBe(200);
    expect(r.can_load_more).toBe(true);
  });

  it("accepts null total_messages and added", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { total_messages: null, added: null, can_load_more: false }),
    );
    const r = await c.messages.loadOlder("c1");
    expect(r.total_messages).toBeNull();
    expect(r.can_load_more).toBe(false);
  });

  it("raises ValidationError when can_load_more is missing", async () => {
    const c = mkClient(() => jsonResponse(200, { total_messages: 1, added: 1 }));
    await expect(c.messages.loadOlder("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.getMedia", () => {
  it("returns typed ChatMedia", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/media/c1/k1");
      return jsonResponse(200, {
        url: "https://cdn.example/x.png",
        mimetype: "image/png",
        filename: "x.png",
        data_base64: null,
        original_quality: true,
        media_unavailable: null,
      });
    });
    const r = await c.messages.getMedia("c1", "k1");
    expect(r.mimetype).toBe("image/png");
    expect(r.original_quality).toBe(true);
  });
});

describe("client.messages.getMediaUrl", () => {
  it("returns typed MediaUrlResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/media_url/c1/k1");
      return jsonResponse(200, { url: "https://cdn.example/x.jpg" });
    });
    const r = await c.messages.getMediaUrl("c1", "k1");
    expect(r.url).toBe("https://cdn.example/x.jpg");
  });

  it("accepts null url", async () => {
    const c = mkClient(() => jsonResponse(200, { url: null }));
    const r = await c.messages.getMediaUrl("c1", "k1");
    expect(r.url).toBeNull();
  });

  it("raises ValidationError when url is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.getMediaUrl("c1", "k1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.batchAcks", () => {
  it("POSTs message_keys and returns BatchMessageAcksResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/acks");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ message_keys: ["k1", "k2"] });
      return jsonResponse(200, {
        data: [
          { key: "k1", ack: 3 },
          { key: "k2", ack: 1 },
        ],
      });
    });
    const r = await c.messages.batchAcks({ message_keys: ["k1", "k2"] });
    expect(r.data).toHaveLength(2);
    expect(r.data[0]?.key).toBe("k1");
    expect(r.data[0]?.ack).toBe(3);
    expect(r.data[1]?.ack).toBe(1);
  });

  it("raises ValidationError when data is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.messages.batchAcks({ message_keys: ["k1"] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.messages.batchAcks({ message_keys: ["k1"] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.messages.listPinned", () => {
  it("returns typed Page<PinnedMessage>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/messages/pinned/c1");
      return jsonResponse(200, {
        data: [{ key: "k1", chat_id: "c1", text: "pinned note" }],
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
        data: [{ key: "k1", chat_id: "c1", text: null }],
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
