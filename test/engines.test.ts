import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.engines.list", () => {
  it("returns typed Engine[] on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/engines");
      return jsonResponse(200, {
        success: true,
        data: [
          {
            id: "eng_1",
            type: "gateway",
            connected: true,
            state: "CONNECTED",
            stream: "CONNECTED",
            hasSynced: true,
          },
        ],
      });
    });
    const result = await c.engines.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]!.id).toBe("eng_1");
    expect(result[0]!.type).toBe("gateway");
    expect(result[0]!.connected).toBe(true);
    expect(result[0]!.hasSynced).toBe(true);
  });

  it("accepts an empty engine list", async () => {
    const c = mkClient(() => jsonResponse(200, { success: true, data: [] }));
    const result = await c.engines.list();
    expect(result).toEqual([]);
  });

  it("accepts a connected engine that omits state/stream/hasSynced", async () => {
    // A connected gateway engine may report only {id,type,connected} and omit
    // state/stream/hasSynced entirely — the schema must accept the absent case
    // (nullish), not just explicit null (the original bug class).
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: [{ id: "eng_3", type: "gateway", connected: true }],
      }),
    );
    const result = await c.engines.list();
    expect(result[0]!.id).toBe("eng_3");
    expect(result[0]!.connected).toBe(true);
    expect(result[0]!.state).toBeUndefined();
    expect(result[0]!.stream).toBeUndefined();
    expect(result[0]!.hasSynced).toBeUndefined();
  });

  it("accepts a disconnected engine with explicit null state/stream/hasSynced", async () => {
    // The live API omits these fields when connected but sends explicit null
    // when disconnected — the schema must accept both (nullish), else Zod
    // rejects the disconnected shape (the original bug class).
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: [{ id: "eng_2", type: "regular", connected: false, state: null, stream: null, hasSynced: null }],
      }),
    );
    const result = await c.engines.list();
    expect(result[0]!.connected).toBe(false);
    expect(result[0]!.state).toBeNull();
    expect(result[0]!.stream).toBeNull();
    expect(result[0]!.hasSynced).toBeNull();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad key", requestId: "req_e" } }),
    );
    const err = await c.engines.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.requestId).toBe("req_e");
  });

  it("raises ValidationError when envelope is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.engines.list()).rejects.toBeInstanceOf(ValidationError);
  });
});
