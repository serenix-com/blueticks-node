import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

describe("client.waLabels.list", () => {
  it("returns the account's native labels as a bare array", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/wa-labels");
      return jsonResponse(200, {
        success: true,
        data: [
          { id: "3", name: "New customer", color: "#2ecc71" },
          { id: "7" },
        ],
      });
    });
    const labels = await c.waLabels.list();
    expect(labels).toHaveLength(2);
    expect(labels[0]!.name).toBe("New customer");
    expect(labels[1]!.name).toBeUndefined();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_l" } }),
    );
    const err = await c.waLabels.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_l");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.waLabels.list()).rejects.toBeInstanceOf(ValidationError);
  });
});
