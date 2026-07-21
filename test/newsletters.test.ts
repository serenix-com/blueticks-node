import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.newsletters.list", () => {
  it("returns a Page<NewsletterListItem> keyed by chatId", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/newsletters");
      expect(url.searchParams.get("searchToken")).toBe("news");
      return jsonResponse(200, {
        success: true,
        data: [
          {
            chatId: "120363@newsletter",
            name: "Daily",
            description: "news",
            subscribers: 1200,
            verification: "VERIFIED",
          },
        ],
        limit: 50,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.newsletters.list({ searchToken: "news" });
    expect(page.data[0]!.chatId).toBe("120363@newsletter");
    expect(page.data[0]!.verification).toBe("VERIFIED");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.newsletters.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.newsletters.create", () => {
  it("returns a newsletter keyed by newsletterId", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      const body = await req.json();
      expect(body).toEqual({ name: "Daily", description: "news" });
      return jsonResponse(201, {
        success: true,
        data: { newsletterId: "120363@newsletter", name: "Daily", subscribers: 0 },
      });
    });
    const res = await c.newsletters.create({ name: "Daily", description: "news" });
    expect(res.newsletterId).toBe("120363@newsletter");
    expect(res.subscribers).toBe(0);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_n" } }),
    );
    const err = await c.newsletters.create({ name: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_n");
  });
});

describe("client.newsletters.retrieve", () => {
  it("gets a newsletter by id", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/newsletters/120363%40newsletter");
      return jsonResponse(200, { success: true, data: { newsletterId: "120363@newsletter", name: "Daily" } });
    });
    const res = await c.newsletters.retrieve("120363@newsletter");
    expect(res.name).toBe("Daily");
  });
});
