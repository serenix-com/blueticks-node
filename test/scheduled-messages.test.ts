import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function baseScheduledMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sm_1",
    to: "+15551230001",
    text: "hello",
    media_url: null,
    media_caption: null,
    media_filename: null,
    media_mime_type: null,
    send_at: "2026-05-15T12:00:00Z",
    status: "scheduled",
    is_recurring: false,
    recurrence_rule: null,
    created_at: "2026-04-23T10:00:00Z",
    updated_at: "2026-04-23T10:00:00Z",
    ...overrides,
  };
}

const authEnvelope = {
  error: { code: "authentication_required", message: "bad key", request_id: "req_a" },
};

describe("client.scheduledMessages.list", () => {
  it("returns paginated Page<ScheduledMessage> on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages");
      return jsonResponse(200, {
        data: [baseScheduledMessage(), baseScheduledMessage({ id: "sm_2" })],
        has_more: false,
        next_cursor: null,
      });
    });
    const result = await c.scheduledMessages.list();
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.id).toBe("sm_1");
    expect(result.data[0]!.is_recurring).toBe(false);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => jsonResponse(401, authEnvelope));
    const err = await c.scheduledMessages.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.message).toContain("bad key");
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required envelope fields missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.retrieve", () => {
  it("GETs /v1/scheduled-messages/:id and returns typed model", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/sm_xyz");
      return jsonResponse(200, baseScheduledMessage({ id: "sm_xyz", status: "queued" }));
    });
    const m = await c.scheduledMessages.retrieve("sm_xyz");
    expect(typeof m.id).toBe("string");
    expect(m.id).toBe("sm_xyz");
    expect(m.status).toBe("queued");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => jsonResponse(401, authEnvelope));
    const err = await c.scheduledMessages.retrieve("sm_xyz").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.retrieve("sm_xyz")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.scheduledMessages.update", () => {
  it("PATCHes /v1/scheduled-messages/:id with body", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/sm_1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ text: "updated", send_at: "2026-06-01T12:00:00Z" });
      return jsonResponse(200, baseScheduledMessage({ text: "updated", send_at: "2026-06-01T12:00:00Z" }));
    });
    const m = await c.scheduledMessages.update("sm_1", {
      text: "updated",
      send_at: "2026-06-01T12:00:00Z",
    });
    expect(m.text).toBe("updated");
    expect(m.send_at).toBe("2026-06-01T12:00:00Z");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => jsonResponse(401, authEnvelope));
    const err = await c.scheduledMessages.update("sm_1", { text: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.update("sm_1", { text: "x" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("client.scheduledMessages.delete", () => {
  it("DELETEs /v1/scheduled-messages/:id and returns typed { id, deleted: true }", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/scheduled-messages/sm_1");
      return jsonResponse(200, { id: "sm_1", deleted: true });
    });
    const r = await c.scheduledMessages.delete("sm_1");
    expect(r.id).toBe("sm_1");
    expect(r.deleted).toBe(true);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => jsonResponse(401, authEnvelope));
    const err = await c.scheduledMessages.delete("sm_1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.scheduledMessages.delete("sm_1")).rejects.toBeInstanceOf(ValidationError);
  });
});
