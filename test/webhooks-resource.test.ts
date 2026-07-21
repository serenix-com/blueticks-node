import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const WEBHOOK = {
  id: "wh_1",
  url: "https://example.test/hook",
  events: ["message.delivered"],
  description: "prod hook",
  status: "enabled",
  createdAt: "2026-04-22T10:00:00Z",
};

describe("client.webhooks.list", () => {
  it("returns a camelCase Page<Webhook>", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/webhooks");
      return jsonResponse(200, { success: true, data: [WEBHOOK], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.webhooks.list();
    expect(page.data[0]!.id).toBe("wh_1");
    expect(page.data[0]!.createdAt).toBe("2026-04-22T10:00:00Z");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.webhooks.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.webhooks.create", () => {
  it("posts and returns the webhook", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      const body = await req.json();
      expect(body).toEqual({ url: "https://example.test/hook", events: ["message.delivered"] });
      return jsonResponse(201, { success: true, data: WEBHOOK });
    });
    const res = await c.webhooks.create({ url: "https://example.test/hook", events: ["message.delivered"] });
    expect(res.id).toBe("wh_1");
    expect(res.status).toBe("enabled");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_w" } }),
    );
    const err = await c.webhooks.create({ url: "x", events: ["message.read"] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_w");
  });
});

describe("client.webhooks.get/update/delete", () => {
  it("get returns a webhook", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/webhooks/wh_1");
      return jsonResponse(200, { success: true, data: WEBHOOK });
    });
    expect((await c.webhooks.get("wh_1")).id).toBe("wh_1");
  });

  it("update patches status", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      const body = await req.json();
      expect(body).toEqual({ status: "disabled" });
      return jsonResponse(200, { success: true, data: { ...WEBHOOK, status: "disabled" } });
    });
    const res = await c.webhooks.update("wh_1", { status: "disabled" });
    expect(res.status).toBe("disabled");
  });

  it("delete returns { id, deleted: true }", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      return jsonResponse(200, { success: true, data: { id: "wh_1", deleted: true } });
    });
    const res = await c.webhooks.delete("wh_1");
    expect(res.deleted).toBe(true);
  });
});
