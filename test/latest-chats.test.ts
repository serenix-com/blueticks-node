import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const AUTH_ERR = (id: string) =>
  jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: id } });

const LATEST = {
  chats: [
    {
      chatId: "14155551234@c.us",
      name: "Jane",
      chatType: "contact",
      pinned: true,
      archived: false,
      lastMessageAt: "2026-04-22T10:00:00Z",
      unreadCount: 2,
      markedUnread: false,
      lastMessageText: "hi",
      lastMessageFromMe: false,
      messages: [
        {
          waMessageKey: { fromMe: false, remote: "14155551234@c.us", id: "A1", _serialized: "false_14155551234@c.us_A1" },
          chatId: "14155551234@c.us",
          from: "14155551234@c.us",
          timestamp: "2026-04-22T10:00:00Z",
          text: "hi",
          type: "chat",
          fromMe: false,
          ack: 3,
          source: "vault",
        },
      ],
    },
  ],
  totalChats: 120,
  numberOfChats: 1,
  numberOfMessages: 1,
};

describe("client.latestChats.list", () => {
  it("returns chats with nested messages and forwards the counts", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(req.method).toBe("GET");
      expect(url.pathname).toBe("/v1/latest-chats");
      expect(url.searchParams.get("numberOfChats")).toBe("1");
      expect(url.searchParams.get("numberOfMessages")).toBe("0");
      return jsonResponse(200, { success: true, data: LATEST });
    });
    const res = await c.latestChats.list({ numberOfChats: 1, numberOfMessages: 0 });
    expect(res.totalChats).toBe(120);
    expect(res.chats[0]!.chatType).toBe("contact");
    expect(res.chats[0]!.messages[0]!.text).toBe("hi");
    expect(res.chats[0]!.messages[0]!.source).toBe("vault");
  });

  it("sends no query when called without params", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).search).toBe("");
      return jsonResponse(200, { success: true, data: { ...LATEST, chats: [] } });
    });
    const res = await c.latestChats.list();
    expect(res.chats).toEqual([]);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_l1"));
    const err = await c.latestChats.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_l1");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.latestChats.list()).rejects.toBeInstanceOf(ValidationError);
  });
});
