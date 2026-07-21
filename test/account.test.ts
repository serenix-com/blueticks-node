import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.account.retrieve", () => {
  it("returns typed Account on 200", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/account");
      return jsonResponse(200, {
        success: true,
        data: {
          id: "acc_1",
          name: "Acme",
          userEmail: "ops@acme.test",
          timezone: "America/New_York",
          createdAt: "2026-04-22T10:00:00Z",
        },
      });
    });
    const result = await c.account.retrieve();
    expect(typeof result.id).toBe("string");
    expect(result.id).toBe("acc_1");
    expect(result.name).toBe("Acme");
    expect(result.userEmail).toBe("ops@acme.test");
    expect(result.timezone).toBe("America/New_York");
    expect(result.createdAt).toBe("2026-04-22T10:00:00Z");
  });

  it("omits optional timezone/userEmail", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { success: true, data: { id: "acc_2", name: "Nobody", createdAt: "2026-01-01T00:00:00Z" } }),
    );
    const result = await c.account.retrieve();
    expect(result.timezone).toBeUndefined();
    expect(result.userEmail).toBeUndefined();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad key", requestId: "req_a" } }),
    );
    const err = await c.account.retrieve().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.message).toContain("bad key");
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.account.retrieve()).rejects.toBeInstanceOf(ValidationError);
  });
});
