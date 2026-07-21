import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const PUBLIC_MSG = {
  waMessageKey: { fromMe: false, remote: "120@g.us", id: "ABC", _serialized: "false_120@g.us_ABC" },
  chatId: "120@g.us",
  from: "111@c.us",
  senderName: "Bob",
  timestamp: "2026-04-22T10:00:00Z",
  text: "hello",
  type: "chat",
  fromMe: false,
  ack: 3,
};

describe("client.messages.list", () => {
  it("returns a Page<PublicMessage> and serializes messageTypes", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages");
      expect(url.searchParams.get("chatId")).toBe("120@g.us");
      expect(url.searchParams.get("messageTypes")).toBe("image,document");
      expect(url.searchParams.get("order")).toBe("asc");
      return jsonResponse(200, { success: true, data: [PUBLIC_MSG], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.messages.list({
      chatId: "120@g.us",
      messageTypes: ["image", "document"],
      order: "asc",
    });
    expect(page.data[0]!.chatId).toBe("120@g.us");
    expect(page.data[0]!.ack).toBe(3);
    expect(page.data[0]!.waMessageKey.fromMe).toBe(false);
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.messages.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.messages.send", () => {
  it("posts a flat body and returns MessageResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/120%40g.us");
      expect(req.headers.get("idempotency-key")).toBe("idem-1");
      const body = await req.json();
      expect(body).toEqual({ type: "text", text: "hi" });
      return jsonResponse(201, {
        success: true,
        data: {
          id: "msg_1",
          to: "120@g.us",
          type: "text",
          status: "confirmed",
          createdAt: "2026-04-22T10:00:00Z",
        },
      });
    });
    const res = await c.messages.send("120@g.us", { type: "text", text: "hi" }, { idempotencyKey: "idem-1" });
    expect(res.id).toBe("msg_1");
    expect(res.status).toBe("confirmed");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_m" } }),
    );
    const err = await c.messages.send("120@g.us", { type: "text", text: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_m");
  });
});

describe("client.messages.get", () => {
  it("fetches by key with optional chatId query", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages/false_120%40g.us_ABC");
      expect(url.searchParams.get("chatId")).toBe("120@g.us");
      return jsonResponse(200, { success: true, data: PUBLIC_MSG });
    });
    const msg = await c.messages.get("false_120@g.us_ABC", { chatId: "120@g.us" });
    expect(msg.type).toBe("chat");
  });
});

describe("client.messages.getAck", () => {
  it("returns the ack value", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/ack/false_120%40g.us_ABC");
      return jsonResponse(200, { success: true, data: { ack: 2 } });
    });
    const res = await c.messages.getAck("false_120@g.us_ABC");
    expect(res.ack).toBe(2);
  });
});

describe("client.messages.batchAcks", () => {
  it("returns a Page<BatchMessageAckEntry>", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/acks");
      const body = await req.json();
      expect(body.messageKeys).toEqual(["k1", "k2"]);
      return jsonResponse(200, {
        success: true,
        data: [
          { key: "k1", ack: 3, found: true },
          { key: "k2", found: false },
        ],
        limit: 200,
        skip: 0,
        total: 2,
      });
    });
    const page = await c.messages.batchAcks({ messageKeys: ["k1", "k2"] });
    expect(page.data[0]!.ack).toBe(3);
    expect(page.data[1]!.found).toBe(false);
  });
});

describe("client.messages.loadOlder", () => {
  it("returns a LoadOlderResult", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/load_older/120%40g.us");
      return jsonResponse(200, {
        success: true,
        data: { totalMessages: 100, added: 20, canLoadMore: true, historyUnavailable: false },
      });
    });
    const res = await c.messages.loadOlder("120@g.us");
    expect(res.added).toBe(20);
    expect(res.canLoadMore).toBe(true);
  });
});

describe("client.messages.getMedia", () => {
  it("returns Media and passes maxAttempts", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages/media/false_120%40g.us_ABC");
      expect(url.searchParams.get("maxAttempts")).toBe("1");
      return jsonResponse(200, {
        success: true,
        data: { url: "https://cdn.test/x.jpg", mimetype: "image/jpeg", originalQuality: true },
      });
    });
    const media = await c.messages.getMedia("false_120@g.us_ABC", { maxAttempts: 1 });
    expect(media.url).toBe("https://cdn.test/x.jpg");
    expect(media.originalQuality).toBe(true);
  });
});

describe("client.messages.listPinned", () => {
  it("returns a Page<PinnedMessage>", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/pinned/120%40g.us");
      return jsonResponse(200, {
        success: true,
        data: [{ key: "k1", chatId: "120@g.us", text: "pinned" }],
        limit: 50,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.messages.listPinned("120@g.us");
    expect(page.data[0]!.key).toBe("k1");
  });
});

describe("client.messages pin/unpin/react", () => {
  it("pin sends duration in body", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/pin/k1");
      const body = await req.json();
      expect(body).toEqual({ duration: 3600 });
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const res = await c.messages.pin("k1", { duration: 3600 });
    expect(res.ok).toBe(true);
  });

  it("unpin returns ok", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/unpin/k1");
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const res = await c.messages.unpin("k1");
    expect(res.ok).toBe(true);
  });

  it("react posts the emoji body", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/reactions/k1");
      const body = await req.json();
      expect(body).toEqual({ emoji: "👍" });
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const res = await c.messages.react("k1", { emoji: "👍" });
    expect(res.ok).toBe(true);
  });
});
