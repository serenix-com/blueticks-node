import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.contacts.list", () => {
  it("returns a camelCase Page<WhatsAppContact>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/contacts");
      expect(url.searchParams.get("searchToken")).toBe("jane");
      expect(url.searchParams.get("limit")).toBe("10");
      return jsonResponse(200, {
        success: true,
        data: [{ chatId: "14155551234@c.us", name: "Jane", isBusiness: false }],
        limit: 10,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.contacts.list({ searchToken: "jane", limit: 10 });
    expect(page.data[0]!.chatId).toBe("14155551234@c.us");
    expect(page.data[0]!.isBusiness).toBe(false);
    expect(page.total).toBe(1);
  });

  it("accepts a contact with only chatId + name (isBusiness omitted)", async () => {
    // Per spec only `chatId` is required; `name`/`isBusiness` are nullish, so a
    // row that omits isBusiness entirely must parse (the original bug class
    // rejected rows missing optional fields).
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: [{ chatId: "14155559999@c.us", name: "Sam" }],
        limit: 50,
        skip: 0,
        total: 1,
      }),
    );
    const page = await c.contacts.list();
    expect(page.data[0]!.chatId).toBe("14155559999@c.us");
    expect(page.data[0]!.name).toBe("Sam");
    expect(page.data[0]!.isBusiness).toBeUndefined();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_k" } }),
    );
    const err = await c.contacts.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_k");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.contacts.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.contacts.listCommonGroups", () => {
  it("returns a Page<GroupListItem>", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/contacts/14155551234%40c.us/common_groups");
      return jsonResponse(200, {
        success: true,
        data: [{ id: "120@g.us", name: "Shared", participantCount: 5 }],
        limit: 50,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.contacts.listCommonGroups("14155551234@c.us");
    expect(page.data[0]!.id).toBe("120@g.us");
    expect(page.data[0]!.participantCount).toBe(5);
  });
});
