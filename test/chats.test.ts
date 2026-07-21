import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const CHAT = {
  chatId: "14155551234@c.us",
  name: "Jane",
  chatType: "contact",
  pinned: false,
  archived: false,
  lastMessageAt: "2026-04-22T10:00:00Z",
  unreadCount: 3,
  markedUnread: false,
};

describe("client.chats.list", () => {
  it("returns a camelCase Page<Chat> on 200", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(req.method).toBe("GET");
      expect(url.pathname).toBe("/v1/chats");
      expect(url.searchParams.get("limit")).toBe("2");
      expect(url.searchParams.get("skip")).toBe("0");
      expect(url.searchParams.get("searchToken")).toBe("jane");
      expect(url.searchParams.get("filter")).toBe("contacts");
      return jsonResponse(200, { success: true, data: [CHAT], limit: 2, skip: 0, total: 1 });
    });
    const page = await c.chats.list({ limit: 2, skip: 0, searchToken: "jane", filter: "contacts" });
    expect(page.total).toBe(1);
    expect(page.limit).toBe(2);
    expect(page.skip).toBe(0);
    expect(page.data[0]!.chatId).toBe("14155551234@c.us");
    expect(page.data[0]!.chatType).toBe("contact");
    expect(page.data[0]!.lastMessageAt).toBe("2026-04-22T10:00:00Z");
    expect(page.data[0]!.unreadCount).toBe(3);
    expect(page.data[0]!.markedUnread).toBe(false);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad key", requestId: "req_c" } }),
    );
    const err = await c.chats.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_c");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.get", () => {
  it("returns a single Chat", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/chats/14155551234%40c.us");
      return jsonResponse(200, { success: true, data: CHAT });
    });
    const chat = await c.chats.get("14155551234@c.us");
    expect(chat.chatId).toBe("14155551234@c.us");
    expect(chat.chatType).toBe("contact");
  });
});

describe("client.chats.listParticipants", () => {
  it("returns a Page<Participant>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/chats/120%40g.us/participants");
      expect(url.searchParams.get("searchToken")).toBe("bob");
      return jsonResponse(200, {
        success: true,
        data: [{ chatId: "111@c.us", name: "Bob", isAdmin: true, isSuperAdmin: false }],
        limit: 100,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.chats.listParticipants("120@g.us", { searchToken: "bob" });
    expect(page.data[0]!.chatId).toBe("111@c.us");
    expect(page.data[0]!.isAdmin).toBe(true);
  });
});

describe("client.chats side-effects", () => {
  for (const [method, segment] of [
    ["markRead", "mark_read"],
    ["archive", "archive"],
    ["unarchive", "unarchive"],
  ] as const) {
    it(`${method} posts and returns { ok: true }`, async () => {
      const c = mkClient((req) => {
        expect(req.method).toBe("POST");
        expect(new URL(req.url).pathname).toBe(`/v1/chats/120%40g.us/${segment}`);
        return jsonResponse(200, { success: true, data: { ok: true } });
      });
      const res = await c.chats[method]("120@g.us");
      expect(res.ok).toBe(true);
    });
  }
});
