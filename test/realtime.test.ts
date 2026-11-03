import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const AUTH_ERR = (id: string) =>
  jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: id } });

describe("client.realtime.token", () => {
  it("POSTs and returns MQTT credentials", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/realtime/token");
      return jsonResponse(201, {
        success: true,
        data: {
          brokerUrl: "wss://mqtt.blueticks.co:443/mqtt",
          username: "user_1",
          password: "jwt.token.here",
          expiresAt: "2099-01-01T00:00:00Z",
          expiresInSeconds: 2000000000,
          topics: { messages: "users/user_1/messages" },
        },
      });
    });
    const res = await c.realtime.token();
    expect(res.brokerUrl).toBe("wss://mqtt.blueticks.co:443/mqtt");
    expect(res.username).toBe("user_1");
    expect(res.topics.messages).toBe("users/user_1/messages");
    expect(res.expiresInSeconds).toBe(2000000000);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_r1"));
    const err = await c.realtime.token().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.requestId).toBe("req_r1");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(201, {}));
    await expect(c.realtime.token()).rejects.toBeInstanceOf(ValidationError);
  });
});
