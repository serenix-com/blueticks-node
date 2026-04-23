import { describe, it, expect } from "vitest";
import { Blueticks } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function baseCampaign(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "cmp_1",
    name: "Spring promo",
    audience_id: "aud_1",
    status: "pending",
    total_count: 0,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    failed_count: 0,
    from: null,
    created_at: "2026-04-23T10:00:00Z",
    started_at: null,
    completed_at: null,
    aborted_at: null,
    ...overrides,
  };
}

describe("client.campaigns", () => {
  it("create POSTs with snake_case audience_id", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/campaigns");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body["audience_id"]).toBe("aud_1");
      expect(body["on_missing_variable"]).toBe("skip");
      return jsonResponse(200, baseCampaign());
    });
    const r = await c.campaigns.create({
      name: "Spring promo",
      audience_id: "aud_1",
      text: "hi",
      on_missing_variable: "skip",
    });
    expect(r.id).toBe("cmp_1");
  });

  it("list returns Campaign[]", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns");
      return jsonResponse(200, [baseCampaign()]);
    });
    const r = await c.campaigns.list();
    expect(r).toHaveLength(1);
  });

  it("get fetches by id", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns/cmp_1");
      return jsonResponse(200, baseCampaign({ status: "running" }));
    });
    const r = await c.campaigns.get("cmp_1");
    expect(r.status).toBe("running");
  });

  it("pause POSTs /pause", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/campaigns/cmp_1/pause");
      return jsonResponse(200, baseCampaign({ status: "paused" }));
    });
    const r = await c.campaigns.pause("cmp_1");
    expect(r.status).toBe("paused");
  });

  it("resume POSTs /resume", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns/cmp_1/resume");
      return jsonResponse(200, baseCampaign({ status: "running" }));
    });
    const r = await c.campaigns.resume("cmp_1");
    expect(r.status).toBe("running");
  });

  it("cancel POSTs /cancel", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns/cmp_1/cancel");
      return jsonResponse(200, baseCampaign({ status: "aborted", aborted_at: "2026-04-23T11:00:00Z" }));
    });
    const r = await c.campaigns.cancel("cmp_1");
    expect(r.status).toBe("aborted");
  });
});
