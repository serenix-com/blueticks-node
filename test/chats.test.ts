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

function baseChat(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "120363000000000000@g.us",
    name: "Engineering",
    is_group: true,
    last_message_at: "2026-04-23T10:00:00Z",
    unread_count: 3,
    ...overrides,
  };
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

describe("client.chats.list", () => {
  it("returns typed Page<Chat> on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/chats");
      expect(url.searchParams.get("query")).toBe("eng");
      expect(url.searchParams.get("limit")).toBe("25");
      return jsonResponse(200, { data: [baseChat()], has_more: false, next_cursor: null });
    });
    const page = await c.chats.list({ query: "eng", limit: 25 });
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.is_group).toBe(true);
    expect(page.has_more).toBe(false);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.get", () => {
  it("GETs /v1/chats/:id and returns Chat", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe(
        "/v1/chats/120363000000000000%40g.us",
      );
      return jsonResponse(200, baseChat());
    });
    const chat = await c.chats.get("120363000000000000@g.us");
    expect(chat.id).toBe("120363000000000000@g.us");
    expect(chat.name).toBe("Engineering");
  });
});

describe("client.chats.listParticipants", () => {
  it("returns typed ParticipantList on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/chats/120363000000000000%40g.us/participants");
      expect(url.searchParams.get("limit")).toBe("100");
      return jsonResponse(200, {
        data: [
          { chat_id: "15551230001@c.us", is_admin: true, is_super_admin: true },
          { chat_id: "15551230002@c.us", is_admin: false },
        ],
        has_more: false,
        next_cursor: null,
      });
    });
    const list = await c.chats.listParticipants("120363000000000000@g.us", { limit: 100 });
    expect(list.data).toHaveLength(2);
    expect(list.data[0]?.is_admin).toBe(true);
    expect(list.data[0]?.is_super_admin).toBe(true);
    expect(list.has_more).toBe(false);
    expect(list.next_cursor).toBeNull();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.listParticipants("c").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.listParticipants("c")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.markRead", () => {
  it("POSTs /v1/chats/:id/mark_read and returns OkResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/mark_read");
      return jsonResponse(200, { ok: true });
    });
    const r = await c.chats.markRead("c1");
    expect(r.ok).toBe(true);
  });

  it("rejects ok:false (literal mismatch)", async () => {
    const c = mkClient(() => jsonResponse(200, { ok: false }));
    await expect(c.chats.markRead("c1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.markRead("c1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.chats.open", () => {
  it("POSTs and returns ChatRef", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/open");
      return jsonResponse(200, { chat_id: "c1@c.us" });
    });
    const r = await c.chats.open("c1");
    expect(r.chat_id).toBe("c1@c.us");
  });

  it("raises ValidationError when chat_id is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.open("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.listMessages", () => {
  it("encodes query params and returns Page<ChatMessage>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/chats/c1/messages");
      expect(url.searchParams.get("mode")).toBe("history");
      expect(url.searchParams.get("query")).toBe("invoice");
      expect(url.searchParams.get("since")).toBe("2026-04-01T00:00:00Z");
      expect(url.searchParams.get("until")).toBe("2026-04-30T00:00:00Z");
      expect(url.searchParams.get("message_types")).toBe("image,document");
      return jsonResponse(200, { data: [baseChatMessage()], has_more: false, next_cursor: null });
    });
    const page = await c.chats.listMessages("c1", {
      mode: "history",
      query: "invoice",
      since: "2026-04-01T00:00:00Z",
      until: "2026-04-30T00:00:00Z",
      message_types: ["image", "document"],
    });
    expect(page.data[0]?.key).toContain("3EB0");
    expect(page.data[0]?.from_me).toBe(false);
  });

  it("defaults mode=latest", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.get("mode")).toBe("latest");
      return jsonResponse(200, { data: [], has_more: false, next_cursor: null });
    });
    await c.chats.listMessages("c1");
  });
});

describe("client.chats.getMessage", () => {
  it("GETs single message", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/messages/k1");
      return jsonResponse(200, baseChatMessage({ key: "k1" }));
    });
    const m = await c.chats.getMessage("c1", "k1");
    expect(m.key).toBe("k1");
    expect(m.text).toBe("hello");
  });
});

describe("client.chats.getMessageAck", () => {
  it("returns typed MessageAck", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/messages/k1/ack");
      return jsonResponse(200, { ack: 3 });
    });
    const r = await c.chats.getMessageAck("c1", "k1");
    expect(r.ack).toBe(3);
  });

  it("accepts null ack", async () => {
    const c = mkClient(() => jsonResponse(200, { ack: null }));
    const r = await c.chats.getMessageAck("c1", "k1");
    expect(r.ack).toBeNull();
  });

  it("raises ValidationError when ack is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.getMessageAck("c1", "k1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.react", () => {
  it("POSTs the body and returns OkResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/messages/k1/reactions");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ emoji: "👍" });
      return jsonResponse(200, { ok: true });
    });
    const r = await c.chats.react("c1", "k1", { emoji: "👍" });
    expect(r.ok).toBe(true);
  });
});

describe("client.chats.loadOlderMessages", () => {
  it("returns typed LoadOlderMessagesResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/messages/load_older");
      return jsonResponse(200, { total_messages: 1500, added: 200, can_load_more: true });
    });
    const r = await c.chats.loadOlderMessages("c1");
    expect(r.total_messages).toBe(1500);
    expect(r.added).toBe(200);
    expect(r.can_load_more).toBe(true);
  });

  it("accepts null total_messages and added", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { total_messages: null, added: null, can_load_more: false }),
    );
    const r = await c.chats.loadOlderMessages("c1");
    expect(r.total_messages).toBeNull();
    expect(r.can_load_more).toBe(false);
  });

  it("raises ValidationError when can_load_more is missing", async () => {
    const c = mkClient(() => jsonResponse(200, { total_messages: 1, added: 1 }));
    await expect(c.chats.loadOlderMessages("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.getMedia", () => {
  it("returns typed ChatMedia", async () => {
    const c = mkClient(() =>
      jsonResponse(200, {
        url: "https://cdn.example/x.png",
        mimetype: "image/png",
        filename: "x.png",
        data_base64: null,
        original_quality: true,
        media_unavailable: null,
      }),
    );
    const r = await c.chats.getMedia("c1", "k1");
    expect(r.mimetype).toBe("image/png");
    expect(r.original_quality).toBe(true);
  });
});

describe("client.chats.getMediaUrl", () => {
  it("returns typed MediaUrlResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/messages/k1/media_url");
      return jsonResponse(200, { url: "https://cdn.example/x.jpg" });
    });
    const r = await c.chats.getMediaUrl("c1", "k1");
    expect(r.url).toBe("https://cdn.example/x.jpg");
  });

  it("accepts null url", async () => {
    const c = mkClient(() => jsonResponse(200, { url: null }));
    const r = await c.chats.getMediaUrl("c1", "k1");
    expect(r.url).toBeNull();
  });

  it("raises ValidationError when url is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.getMediaUrl("c1", "k1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.batchMessageAcks", () => {
  it("POSTs message_keys and returns BatchMessageAcksResponse", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/message_acks");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ message_keys: ["k1", "k2"] });
      return jsonResponse(200, {
        data: [
          { key: "k1", ack: 3 },
          { key: "k2", ack: 1 },
        ],
      });
    });
    const r = await c.chats.batchMessageAcks({ message_keys: ["k1", "k2"] });
    expect(r.data).toHaveLength(2);
    expect(r.data[0]?.key).toBe("k1");
    expect(r.data[0]?.ack).toBe(3);
    expect(r.data[1]?.ack).toBe(1);
  });

  it("raises ValidationError when data is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.chats.batchMessageAcks({ message_keys: ["k1"] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.batchMessageAcks({ message_keys: ["k1"] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});
