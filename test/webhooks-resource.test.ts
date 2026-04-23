import { describe, it, expect } from "vitest";
import { Blueticks } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function baseWebhook(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "wh_1",
    url: "https://example.com/hook",
    events: ["message.delivered"],
    description: null,
    status: "enabled",
    created_at: "2026-04-23T10:00:00Z",
    ...overrides,
  };
}

describe("client.webhooks", () => {
  it("create returns secret", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/webhooks");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ url: "https://example.com/hook", events: ["message.delivered"] });
      return jsonResponse(200, { ...baseWebhook(), secret: "whsec_abc" });
    });
    const wh = await c.webhooks.create({ url: "https://example.com/hook", events: ["message.delivered"] });
    expect(wh.secret).toBe("whsec_abc");
    expect(wh.id).toBe("wh_1");
  });

  it("list returns typed Webhook[]", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/webhooks");
      return jsonResponse(200, [baseWebhook(), baseWebhook({ id: "wh_2" })]);
    });
    const result = await c.webhooks.list();
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("wh_1");
  });

  it("get by id", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/webhooks/wh_42");
      return jsonResponse(200, baseWebhook({ id: "wh_42" }));
    });
    const wh = await c.webhooks.get("wh_42");
    expect(wh.id).toBe("wh_42");
  });

  it("update PATCHes", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/webhooks/wh_1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ status: "disabled" });
      return jsonResponse(200, baseWebhook({ status: "disabled" }));
    });
    const wh = await c.webhooks.update("wh_1", { status: "disabled" });
    expect(wh.status).toBe("disabled");
  });

  it("delete returns undefined on 204", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/webhooks/wh_1");
      return new Response(null, { status: 204 });
    });
    const result = await c.webhooks.delete("wh_1");
    expect(result).toBeUndefined();
  });

  it("rotateSecret POSTs and returns new secret", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/webhooks/wh_1/rotate-secret");
      return jsonResponse(200, { ...baseWebhook(), secret: "whsec_new" });
    });
    const wh = await c.webhooks.rotateSecret("wh_1");
    expect(wh.secret).toBe("whsec_new");
  });
});
