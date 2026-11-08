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

describe("client.messages.batchAcks (bare-array envelope)", () => {
  it("accepts { success, data: [...] } with no limit/skip/total", async () => {
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: [
          { key: "k1", ack: 3, found: true },
          { key: "k2", found: false },
        ],
      }),
    );
    const page = await c.messages.batchAcks({ messageKeys: ["k1", "k2"] });
    expect(page.data).toHaveLength(2);
    expect(page.data[0]!.ack).toBe(3);
    expect(page).toMatchObject({ limit: 2, skip: 0, total: 2 });
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

describe("client.messages.listPinned (bare-array envelope)", () => {
  it("accepts { success, data: [...] } with no limit/skip/total", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { success: true, data: [{ key: "k1", chatId: "120@g.us", text: "pinned" }] }),
    );
    const page = await c.messages.listPinned("120@g.us");
    expect(page.data[0]!.key).toBe("k1");
    expect(page).toMatchObject({ limit: 1, skip: 0, total: 1 });
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

describe("client.messages.list (new filters + response fields)", () => {
  it("serializes queryAny/mime/filenameContains/hasMedia/sender and surfaces coverage", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("queryAny")).toBe("invoice,receipt");
      expect(url.searchParams.get("mime")).toBe("application/pdf");
      expect(url.searchParams.get("filenameContains")).toBe("inv");
      expect(url.searchParams.get("hasMedia")).toBe("true");
      expect(url.searchParams.get("sender")).toBe("1415");
      return jsonResponse(200, {
        success: true,
        data: [{ ...PUBLIC_MSG, source: "backup", secret: "corr-1" }],
        limit: 50,
        skip: 0,
        total: 1,
        coverage: { oldestLoadedTimestamp: 1700000000000, oldestLoadedIso: "2023-11-14T22:13:20.000Z" },
      });
    });
    const page = await c.messages.list({
      queryAny: ["invoice", "receipt"],
      mime: "application/pdf",
      filenameContains: "inv",
      hasMedia: true,
      sender: "1415",
    });
    expect(page.data[0]!.source).toBe("backup");
    expect(page.data[0]!.secret).toBe("corr-1");
    expect(page.coverage?.oldestLoadedIso).toBe("2023-11-14T22:13:20.000Z");
  });

  it("omits coverage when the server does not send it", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.has("queryAny")).toBe(false);
      return jsonResponse(200, { success: true, data: [PUBLIC_MSG], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.messages.list({ queryAny: [] });
    expect(page.coverage).toBeUndefined();
  });
});

describe("client.messages.send (mentions)", () => {
  it("passes mentions through in the body", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({ type: "text", text: "hi @Bob", mentions: ["12025550101@c.us"] });
      return jsonResponse(201, {
        success: true,
        data: { id: "m1", to: "120@g.us", type: "text", status: "sent", createdAt: "2026-04-22T10:00:00Z" },
      });
    });
    await c.messages.send("120@g.us", { type: "text", text: "hi @Bob", mentions: ["12025550101@c.us"] });
  });
});

describe("client.messages.get (secret/source)", () => {
  it("parses secret and source", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { success: true, data: { ...PUBLIC_MSG, secret: "s1", source: "vault" } }),
    );
    const res = await c.messages.get("k1");
    expect(res.secret).toBe("s1");
    expect(res.source).toBe("vault");
  });
});

describe("client.messages.loadOlder (pages / until_date / coverage)", () => {
  it("sends pages + until_date and parses pagesExecuted + coverage", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(await req.json()).toEqual({ pages: 3, until_date: "2025-01-01T00:00:00Z" });
      return jsonResponse(200, {
        success: true,
        data: {
          totalMessages: 300,
          added: 120,
          canLoadMore: false,
          historyUnavailable: false,
          error: null,
          pagesExecuted: 2,
          coverage: { oldestLoadedTimestamp: 1735689600000, oldestLoadedIso: "2025-01-01T00:00:00.000Z" },
        },
      });
    });
    const res = await c.messages.loadOlder("120@g.us", { pages: 3, until_date: "2025-01-01T00:00:00Z" });
    expect(res.pagesExecuted).toBe(2);
    expect(res.coverage?.oldestLoadedTimestamp).toBe(1735689600000);
    expect(res.canLoadMore).toBe(false);
  });

  it("sends no body when no options are given", async () => {
    const c = mkClient(async (req) => {
      expect(await req.text()).toBe("");
      return jsonResponse(200, {
        success: true,
        data: { canLoadMore: true, historyUnavailable: false, pagesExecuted: 1, coverage: {} },
      });
    });
    const res = await c.messages.loadOlder("120@g.us");
    expect(res.pagesExecuted).toBe(1);
  });

  it("accepts a numeric until_date", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({ until_date: 1735689600 });
      return jsonResponse(200, { success: true, data: { canLoadMore: true, historyUnavailable: false } });
    });
    await c.messages.loadOlder("120@g.us", { until_date: 1735689600 });
  });
});

describe("client.messages.list (engine targeting + new message fields)", () => {
  it("forwards engine/engineId/numberId and parses waType, groupEvent, call, interactive, reactions", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("engine")).toBe("regular");
      expect(url.searchParams.get("engineId")).toBe("eng_9");
      expect(url.searchParams.get("numberId")).toBe("num_2");
      return jsonResponse(200, {
        success: true,
        data: [
          { ...PUBLIC_MSG, type: "chat", waType: "buttons_response", interactive: { kind: "buttons_response", selectedId: "b1", selectedTitle: "Yes", quotedId: "false_120@g.us_Q" } },
          { ...PUBLIC_MSG, type: "chat", waType: "gp2", subtype: "add", groupEvent: { action: "add", actor: "111@c.us", targets: ["222@c.us"] } },
          { ...PUBLIC_MSG, type: "call_log", waType: "call_log", call: { direction: "in", media: "voice", outcome: "answered", durationSec: 42, isGroup: false } },
          { ...PUBLIC_MSG, reactions: [{ emoji: "\u{1F44D}", senderId: "333@c.us", fromMe: false, timestamp: "2026-04-22T10:01:00Z" }] },
        ],
        limit: 50,
        skip: 0,
        total: 4,
        answeredBy: { engineId: "eng_9", numberId: "num_2", phoneNumber: "14155551234" },
        nextCursor: "50",
        hasMore: true,
        sinceReached: true,
        autoLoadedPages: 0,
        sources: { backup: 1 },
        coverage: { oldestLoadedIso: "2026-04-01T00:00:00.000Z", messagesScanned: 120, truncated: false, indexOnly: false },
      });
    });
    const page = await c.messages.list({ engine: "regular", engineId: "eng_9", numberId: "num_2" });
    expect(page.data[0]!.interactive?.selectedTitle).toBe("Yes");
    expect(page.data[0]!.waType).toBe("buttons_response");
    expect(page.data[1]!.groupEvent?.action).toBe("add");
    expect(page.data[1]!.subtype).toBe("add");
    expect(page.data[2]!.call?.durationSec).toBe(42);
    expect(page.data[3]!.reactions?.[0]!.emoji).toBe("\u{1F44D}");
    expect(page.answeredBy?.phoneNumber).toBe("14155551234");
    expect(page.nextCursor).toBe("50");
    expect(page.hasMore).toBe(true);
    expect(page.sinceReached).toBe(true);
    expect(page.sources?.backup).toBe(1);
    expect(page.coverage?.messagesScanned).toBe(120);
  });

  it("leaves the new fields undefined when the server omits them", async () => {
    const c = mkClient(() => jsonResponse(200, { success: true, data: [PUBLIC_MSG], limit: 50, skip: 0, total: 1 }));
    const page = await c.messages.list();
    expect(page.answeredBy).toBeUndefined();
    expect(page.nextCursor).toBeUndefined();
    expect(page.hasMore).toBeUndefined();
    expect(page.data[0]!.call).toBeUndefined();
    expect(page.data[0]!.reactions).toBeUndefined();
  });
});

describe("client.messages.send (buttonReply, type optional, labels, media ids)", () => {
  it("sends a menu reply with no type and the new fields", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/messages/120%40g.us");
      expect(await req.json()).toEqual({
        buttonReply: { replyTo: "false_120@g.us_M1", buttonId: "b1" },
        engine: "gateway",
        numberId: "num_2",
      });
      return jsonResponse(201, { success: true, data: { to: "120@g.us", type: "text", status: "sent", createdAt: "2026-04-22T10:00:00Z" } });
    });
    const res = await c.messages.send("120@g.us", {
      buttonReply: { replyTo: "false_120@g.us_M1", buttonId: "b1" },
      engine: "gateway",
      numberId: "num_2",
    });
    expect(res.status).toBe("sent");
  });

  it("sends mediaFileId, mediaMimeType, from and waLabelIds", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({
        type: "media",
        mediaFileId: "Ab12Cd34Ef56",
        mediaMimeType: "image/png",
        from: "+15550001234",
        waLabelIds: ["3"],
      });
      return jsonResponse(201, { success: true, data: { to: "120@g.us", type: "media", status: "sent", createdAt: "2026-04-22T10:00:00Z" } });
    });
    const res = await c.messages.send("120@g.us", {
      type: "media",
      mediaFileId: "Ab12Cd34Ef56",
      mediaMimeType: "image/png",
      from: "+15550001234",
      waLabelIds: ["3"],
    });
    expect(res.type).toBe("media");
  });
});
