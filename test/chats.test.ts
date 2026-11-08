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

describe("client.chats.list (kinds + since)", () => {
  it("serializes kinds as a comma list and forwards since", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("kinds")).toBe("contact,newsletter");
      expect(url.searchParams.get("since")).toBe("2026-04-01T00:00:00+02:00");
      return jsonResponse(200, { success: true, data: [CHAT], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.chats.list({ kinds: ["contact", "newsletter"], since: "2026-04-01T00:00:00+02:00" });
    expect(page.data[0]!.chatId).toBe("14155551234@c.us");
  });

  it("omits kinds when the array is empty", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.has("kinds")).toBe(false);
      return jsonResponse(200, { success: true, data: [], limit: 50, skip: 0, total: 0 });
    });
    await c.chats.list({ kinds: [] });
  });
});

describe("client.chats.listWaLabels", () => {
  it("gets the native labels assigned to a chat", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/chats/14155551234%40c.us/wa-labels");
      return jsonResponse(200, { success: true, data: [{ id: "3", name: "VIP", color: "#f1c40f" }] });
    });
    const labels = await c.chats.listWaLabels("14155551234@c.us");
    expect(labels[0]!.id).toBe("3");
    expect(labels[0]!.name).toBe("VIP");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_cl" } }),
    );
    const err = await c.chats.listWaLabels("14155551234@c.us").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_cl");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.listWaLabels("14155551234@c.us")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.chats.updateWaLabels", () => {
  it("replaces the label set with a PATCH body of labelIds", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/chats/14155551234%40c.us/wa-labels");
      expect(await req.json()).toEqual({ labelIds: ["3", "7"] });
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const res = await c.chats.updateWaLabels("14155551234@c.us", { labelIds: ["3", "7"] });
    expect(res.ok).toBe(true);
  });

  it("clears all labels with an empty labelIds array", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({ labelIds: [] });
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const res = await c.chats.updateWaLabels("14155551234@c.us", { labelIds: [] });
    expect(res.ok).toBe(true);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_cu" } }),
    );
    const err = await c.chats.updateWaLabels("14155551234@c.us", { labelIds: [] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_cu");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.chats.updateWaLabels("14155551234@c.us", { labelIds: ["3"] })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("client.chats.list (engine targeting + paging metadata)", () => {
  it("forwards engine-target params and surfaces answeredBy + nextCursor", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("engine")).toBe("gateway");
      expect(url.searchParams.get("engineId")).toBe("6a7d63444fe1b47b779ae6c6");
      expect(url.searchParams.get("numberId")).toBe("num_1");
      expect(url.searchParams.get("phone")).toBe("+14155551234");
      expect(url.searchParams.get("fanoutLimit")).toBe("3");
      return jsonResponse(200, {
        success: true,
        data: [CHAT],
        limit: 50,
        skip: 0,
        total: 1,
        answeredBy: { engineId: "6a7d63444fe1b47b779ae6c6", numberId: "num_1", phoneNumber: "14155551234" },
        nextCursor: null,
      });
    });
    const page = await c.chats.list({
      engine: "gateway",
      engineId: "6a7d63444fe1b47b779ae6c6",
      numberId: "num_1",
      phone: "+14155551234",
      fanoutLimit: 3,
    });
    expect(page.answeredBy?.engineId).toBe("6a7d63444fe1b47b779ae6c6");
    expect(page.answeredBy?.phoneNumber).toBe("14155551234");
    expect(page.nextCursor).toBeNull();
  });

  it("omits answeredBy and nextCursor when the server does not send them", async () => {
    const c = mkClient(() => jsonResponse(200, { success: true, data: [CHAT], limit: 50, skip: 0, total: 1 }));
    const page = await c.chats.list();
    expect(page.answeredBy).toBeUndefined();
    expect(page.nextCursor).toBeUndefined();
    expect(page.data).toHaveLength(1);
  });
});
