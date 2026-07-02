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

function baseChat(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "120363000000000000@g.us",
    name: "Engineering",
    isGroup: true,
    isNewsletter: false,
    lastMessageAt: "2026-04-23T10:00:00Z",
    unreadCount: 3,
    markedUnread: false,
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
    expect(page.data[0]?.isGroup).toBe(true);
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
          { chatId: "15551230001@c.us", isAdmin: true, isSuperAdmin: true },
          { chatId: "15551230002@c.us", isAdmin: false },
        ],
        has_more: false,
        next_cursor: null,
      });
    });
    const list = await c.chats.listParticipants("120363000000000000@g.us", { limit: 100 });
    expect(list.data).toHaveLength(2);
    expect(list.data[0]?.isAdmin).toBe(true);
    expect(list.data[0]?.isSuperAdmin).toBe(true);
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

describe("client.chats.archive", () => {
  it("POSTs /v1/chats/:id/archive and returns OkResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/archive");
      return jsonResponse(200, { ok: true });
    });
    const r = await c.chats.archive("c1");
    expect(r.ok).toBe(true);
  });

  it("rejects ok:false (literal mismatch)", async () => {
    const c = mkClient(() => jsonResponse(200, { ok: false }));
    await expect(c.chats.archive("c1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.archive("c1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.chats.unarchive", () => {
  it("POSTs /v1/chats/:id/unarchive and returns OkResponse", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/unarchive");
      return jsonResponse(200, { ok: true });
    });
    const r = await c.chats.unarchive("c1");
    expect(r.ok).toBe(true);
  });

  it("rejects ok:false (literal mismatch)", async () => {
    const c = mkClient(() => jsonResponse(200, { ok: false }));
    await expect(c.chats.unarchive("c1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.chats.unarchive("c1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.chats.open", () => {
  it("POSTs and returns ChatRef", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/chats/c1/open");
      return jsonResponse(200, { chatId: "c1@c.us" });
    });
    const r = await c.chats.open("c1");
    expect(r.chatId).toBe("c1@c.us");
  });

  it("raises ValidationError when chatId is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.open("c1")).rejects.toBeInstanceOf(ValidationError);
  });
});
