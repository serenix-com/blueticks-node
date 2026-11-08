import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const AUTH_ERR = (id: string) =>
  jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: id } });

const IDENTITY = {
  input: "120813554507870@lid",
  resolved: true,
  canonical: "14155551234@c.us",
  phone: "14155551234",
  lid: "120813554507870@lid",
  aliases: ["120813554507870@lid", "14155551234@c.us"],
  type: "user",
  source: "engine",
};

describe("client.identity.get", () => {
  it("returns a resolved Identity and URL-encodes the id", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/identity/120813554507870%40lid");
      return jsonResponse(200, { success: true, data: IDENTITY });
    });
    const res = await c.identity.get("120813554507870@lid");
    expect(res.resolved).toBe(true);
    expect(res.canonical).toBe("14155551234@c.us");
    expect(res.aliases).toContain("14155551234@c.us");
    expect(res.source).toBe("engine");
  });

  it("accepts the fail-closed unresolved shape with absent optionals", async () => {
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: { input: "9@lid", resolved: false, aliases: ["9@lid"], type: "unknown", source: "unknown" },
      }),
    );
    const res = await c.identity.get("9@lid");
    expect(res.resolved).toBe(false);
    expect(res.canonical).toBeUndefined();
    expect(res.type).toBe("unknown");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_i1"));
    const err = await c.identity.get("1@lid").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.requestId).toBe("req_i1");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.identity.get("1@lid")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.identity.resolve", () => {
  it("posts ids and returns an order-preserving list", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/identity/resolve");
      expect(await req.json()).toEqual({ ids: ["120813554507870@lid", "120@g.us"] });
      return jsonResponse(200, {
        success: true,
        data: [
          IDENTITY,
          { input: "120@g.us", resolved: true, canonical: "120@g.us", aliases: ["120@g.us"], type: "group", source: "cache" },
        ],
      });
    });
    const res = await c.identity.resolve(["120813554507870@lid", "120@g.us"]);
    expect(res.data).toHaveLength(2);
    expect(res.data[0]!.phone).toBe("14155551234");
    expect(res.data[1]!.type).toBe("group");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_i2"));
    const err = await c.identity.resolve(["1@lid"]).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_i2");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.identity.resolve(["1@lid"])).rejects.toBeInstanceOf(ValidationError);
  });
});
