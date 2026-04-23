import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.ping", () => {
  it("returns typed Ping on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/ping");
      return jsonResponse(200, {
        account_id: "acc_abc",
        key_prefix: "xy12ab34",
        scopes: ["messages:read"],
      });
    });
    const result = await c.ping();
    expect(typeof result.account_id).toBe("string");
    expect(result.account_id).toBe("acc_abc");
    expect(result.key_prefix).toBe("xy12ab34");
    expect(result.scopes).toEqual(["messages:read"]);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad key", request_id: "req_1" } }),
    );
    const err = await c.ping().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.message).toContain("bad key");
    expect(err.requestId).toBe("req_1");
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.ping()).rejects.toBeInstanceOf(ValidationError);
  });
});
