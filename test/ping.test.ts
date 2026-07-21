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
        success: true,
        data: {
          api: "ok",
          accountId: "acc_abc",
          whatsappConnections: [{ id: "eng_1", type: "gateway", connected: true }],
        },
      });
    });
    const result = await c.ping();
    expect(result.api).toBe("ok");
    expect(result.accountId).toBe("acc_abc");
    expect(result.whatsappConnections[0]!.id).toBe("eng_1");
    expect(result.whatsappConnections[0]!.type).toBe("gateway");
  });

  it("accepts an empty connection list with message", async () => {
    const c = mkClient(() =>
      jsonResponse(200, {
        success: true,
        data: { api: "ok", accountId: "acc_x", whatsappConnections: [], message: "No WhatsApp connected." },
      }),
    );
    const result = await c.ping();
    expect(result.whatsappConnections).toEqual([]);
    expect(result.message).toBe("No WhatsApp connected.");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad key", requestId: "req_1" } }),
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
