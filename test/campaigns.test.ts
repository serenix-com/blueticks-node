import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const CAMPAIGN = {
  cmpId: "cmp_1",
  name: "Spring blast",
  audienceId: "aud_1",
  status: "running",
  totalCount: 100,
  sentCount: 40,
  deliveredCount: 30,
  readCount: 10,
  failedCount: 1,
  createdAt: "2026-04-22T10:00:00Z",
  startedAt: "2026-04-22T10:05:00Z",
};

describe("client.campaigns.list", () => {
  it("returns a camelCase Page<Campaign>", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns");
      return jsonResponse(200, { success: true, data: [CAMPAIGN], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.campaigns.list();
    expect(page.data[0]!.cmpId).toBe("cmp_1");
    expect(page.data[0]!.audienceId).toBe("aud_1");
    expect(page.data[0]!.sentCount).toBe(40);
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.campaigns.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.campaigns.create", () => {
  it("posts audienceId in the body", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      const body = await req.json();
      expect(body).toEqual({ name: "Spring blast", audienceId: "aud_1", text: "Hi {firstName}" });
      return jsonResponse(200, { success: true, data: { ...CAMPAIGN, status: "pending" } });
    });
    const res = await c.campaigns.create({ name: "Spring blast", audienceId: "aud_1", text: "Hi {firstName}" });
    expect(res.status).toBe("pending");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_cm" } }),
    );
    const err = await c.campaigns.create({ name: "x", audienceId: "a" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_cm");
  });
});

describe("client.campaigns lifecycle", () => {
  it("get returns a campaign", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/campaigns/cmp_1");
      return jsonResponse(200, { success: true, data: CAMPAIGN });
    });
    const res = await c.campaigns.get("cmp_1");
    expect(res.cmpId).toBe("cmp_1");
  });

  for (const [method, segment, status] of [
    ["pause", "pause", "paused"],
    ["resume", "resume", "running"],
    ["cancel", "cancel", "aborted"],
  ] as const) {
    it(`${method} posts and returns the campaign`, async () => {
      const c = mkClient((req) => {
        expect(req.method).toBe("POST");
        expect(new URL(req.url).pathname).toBe(`/v1/campaigns/cmp_1/${segment}`);
        return jsonResponse(200, { success: true, data: { ...CAMPAIGN, status } });
      });
      const res = await c.campaigns[method]("cmp_1");
      expect(res.status).toBe(status);
    });
  }
});
