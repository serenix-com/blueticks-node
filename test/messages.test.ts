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
      expect(url.searchParams.get("mode")).toBe("history");
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
      mode: "history",
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

  it("defaults mode=latest and omits chatId when not provided", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/messages");
      expect(url.searchParams.get("mode")).toBe("latest");
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
