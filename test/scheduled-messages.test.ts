import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const MESSAGE = {
  id: "msg_1",
  to: "14155551234@c.us",
  type: "text",
  text: "hello",
  status: "pending",
  createdAt: "2026-04-22T10:00:00Z",
};

describe("client.scheduledMessages.list", () => {
  it("returns a Page<MessageResponse> with filters", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/scheduled-messages");
      expect(url.searchParams.get("chatId")).toBe("14155551234@c.us");
      expect(url.searchParams.get("status")).toBe("pending");
      expect(url.searchParams.get("order")).toBe("desc");
      return jsonResponse(200, { success: true, data: [MESSAGE], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.scheduledMessages.list({
      chatId: "14155551234@c.us",
      status: "pending",
      order: "desc",
    });
    expect(page.data[0]!.id).toBe("msg_1");
    expect(page.data[0]!.status).toBe("pending");
    expect(page.total).toBe(1);
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.create", () => {
  it("posts to /{chatId} with the idempotency key", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/14155551234%40c.us");
      expect(req.headers.get("idempotency-key")).toBe("idem-2");
      const body = await req.json();
      expect(body).toEqual({ type: "text", text: "hello", sendAt: "2026-05-01T09:00:00Z" });
      return jsonResponse(201, { success: true, data: MESSAGE });
    });
    const res = await c.scheduledMessages.create(
      "14155551234@c.us",
      { type: "text", text: "hello", sendAt: "2026-05-01T09:00:00Z" },
      { idempotencyKey: "idem-2" },
    );
    expect(res.id).toBe("msg_1");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_s" } }),
    );
    const err = await c.scheduledMessages
      .create("14155551234@c.us", { type: "text", text: "x" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_s");
  });
});

describe("client.scheduledMessages.retrieve", () => {
  it("gets a message by id", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/msg_1");
      return jsonResponse(200, { success: true, data: MESSAGE });
    });
    const res = await c.scheduledMessages.retrieve("msg_1");
    expect(res.id).toBe("msg_1");
  });
});

describe("client.scheduledMessages.update", () => {
  it("patches editable fields", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/msg_1");
      const body = await req.json();
      expect(body).toEqual({ text: "edited" });
      return jsonResponse(200, { success: true, data: { ...MESSAGE, text: "edited" } });
    });
    const res = await c.scheduledMessages.update("msg_1", { text: "edited" });
    expect(res.text).toBe("edited");
  });
});

describe("client.scheduledMessages.delete", () => {
  it("returns { id, deleted: true }", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/msg_1");
      return jsonResponse(200, { success: true, data: { id: "msg_1", deleted: true } });
    });
    const res = await c.scheduledMessages.delete("msg_1");
    expect(res.deleted).toBe(true);
    expect(res.id).toBe("msg_1");
  });
});
