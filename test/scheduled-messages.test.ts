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

describe("client.scheduledMessages mentions + recipientName", () => {
  it("create passes mentions and recipientName through", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({
        type: "text",
        text: "hi @Bob",
        mentions: ["12025550101@c.us"],
        recipientName: "Team chat",
      });
      return jsonResponse(201, { success: true, data: MESSAGE });
    });
    const res = await c.scheduledMessages.create("120@g.us", {
      type: "text",
      text: "hi @Bob",
      mentions: ["12025550101@c.us"],
      recipientName: "Team chat",
    });
    expect(res.id).toBe("msg_1");
  });

  it("update passes mentions through", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(await req.json()).toEqual({ mentions: ["12025550101@c.us"] });
      return jsonResponse(200, { success: true, data: MESSAGE });
    });
    const res = await c.scheduledMessages.update("msg_1", { mentions: ["12025550101@c.us"] });
    expect(res.id).toBe("msg_1");
  });
});

describe("client.scheduledMessages.cancel", () => {
  it("posts to /{id}/cancel and returns the message as it now stands", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/msg_1/cancel");
      return jsonResponse(200, {
        success: true,
        data: {
          ...MESSAGE,
          status: "failed",
          failureReason: "cancelled by user",
          failedAt: "2026-04-22T10:05:00Z",
        },
      });
    });
    const res = await c.scheduledMessages.cancel("msg_1");
    expect(res.status).toBe("failed");
    expect(res.failureReason).toBe("cancelled by user");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_sc" } }),
    );
    const err = await c.scheduledMessages.cancel("msg_1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_sc");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.cancel("msg_1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages (recurrence, labels, warning, includeSent/includePreview)", () => {
  it("parses recurrence, waLabels, warning and recipientName", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.searchParams.get("includeSent")).toBe("true");
      expect(url.searchParams.get("includePreview")).toBe("false");
      return jsonResponse(200, {
        success: true,
        data: [
          {
            ...MESSAGE,
            recipientName: "Jane",
            recurrence: { frequency: "weekly", interval: 2, byWeekday: ["MO", "FR"], endsAfter: 4, timezone: "Asia/Jerusalem" },
            waLabels: { requested: 2, applied: false, error: "wa_business_required" },
            warning: { code: "no_engine_connected", message: "No engine was connected when this was scheduled." },
          },
        ],
        limit: 50,
        skip: 0,
        total: 1,
        answeredBy: { engineId: "eng_1" },
        nextCursor: "50",
      });
    });
    const page = await c.scheduledMessages.list({ includeSent: true, includePreview: false });
    const m = page.data[0]!;
    expect(m.recipientName).toBe("Jane");
    expect(m.recurrence?.frequency).toBe("weekly");
    expect(m.recurrence?.byWeekday).toEqual(["MO", "FR"]);
    expect(m.waLabels?.applied).toBe(false);
    expect(m.warning?.code).toBe("no_engine_connected");
    expect(page.nextCursor).toBe("50");
    expect(page.answeredBy?.engineId).toBe("eng_1");
  });

  it("leaves the new fields undefined for a one-time message", async () => {
    const c = mkClient(() => jsonResponse(200, { success: true, data: MESSAGE }));
    const m = await c.scheduledMessages.retrieve("msg_1");
    expect(m.recurrence).toBeUndefined();
    expect(m.waLabels).toBeUndefined();
    expect(m.warning).toBeUndefined();
  });

  it("sends recurrence, waLabelIds, buttonReply and from without a type", async () => {
    const c = mkClient(async (req) => {
      expect(await req.json()).toEqual({
        text: "weekly",
        sendAt: "2026-05-01T09:00:00Z",
        recurrence: { frequency: "weekly", byWeekday: ["MO"], endsAfter: 3 },
        waLabelIds: ["3"],
        from: "+15550001234",
      });
      return jsonResponse(201, { success: true, data: MESSAGE });
    });
    await c.scheduledMessages.create("14155551234@c.us", {
      text: "weekly",
      sendAt: "2026-05-01T09:00:00Z",
      recurrence: { frequency: "weekly", byWeekday: ["MO"], endsAfter: 3 },
      waLabelIds: ["3"],
      from: "+15550001234",
    });
  });

  it("sends mediaFileId and mediaMimeType on update", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(await req.json()).toEqual({ mediaFileId: "Ab12Cd34Ef56", mediaMimeType: "image/png" });
      return jsonResponse(200, { success: true, data: MESSAGE });
    });
    await c.scheduledMessages.update("msg_1", { mediaFileId: "Ab12Cd34Ef56", mediaMimeType: "image/png" });
  });
});
