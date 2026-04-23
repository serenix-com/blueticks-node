// test/transport.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { Transport } from "../src/transport";
import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from "../src/errors";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

const OkSchema = z.object({ ok: z.boolean() });

function makeTransport(handler: Parameters<typeof mockFetch>[0], opts: { maxRetries?: number } = {}): Transport {
  return new Transport({
    apiKey: "bt_test_abc",
    baseUrl: "https://example.test",
    timeout: 5000,
    maxRetries: opts.maxRetries ?? 2,
    userAgentSuffix: null,
    version: "1.0.0",
    fetch: mockFetch(handler),
  });
}

describe("Transport", () => {
  it("returns parsed JSON on 200 with schema", async () => {
    const t = makeTransport((req) => {
      expect(req.headers.get("authorization")).toBe("Bearer bt_test_abc");
      expect(req.headers.get("user-agent")).toContain("blueticks-node/1.0.0");
      return jsonResponse(200, { ok: true });
    });
    const result = await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema });
    expect(result).toEqual({ ok: true });
  });

  it("raises AuthenticationError on 401", async () => {
    const t = makeTransport(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "bad", request_id: "r" } }),
    );
    await expect(t.request({ method: "GET", path: "/v1/ping", schema: OkSchema })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("raises APIError on non-JSON 502", async () => {
    const t = makeTransport(() => new Response("<html>bad</html>", { status: 502 }));
    await expect(t.request({ method: "GET", path: "/v1/ping", schema: OkSchema })).rejects.toBeInstanceOf(APIError);
  });

  it("retries 429 with retry-after: 0", async () => {
    let n = 0;
    const t = makeTransport(() => {
      n++;
      if (n === 1) {
        return new Response(
          JSON.stringify({ error: { code: "rate_limited", message: "slow", request_id: "r" } }),
          { status: 429, headers: { "retry-after": "0", "content-type": "application/json" } },
        );
      }
      return jsonResponse(200, { ok: true });
    }, { maxRetries: 3 });
    const result = await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema });
    expect(result).toEqual({ ok: true });
    expect(n).toBe(2);
  });

  it("exhausts retries and raises RateLimitError", async () => {
    const t = makeTransport(
      () =>
        new Response(JSON.stringify({ error: { code: "rate_limited", message: "slow", request_id: "r" } }), {
          status: 429,
          headers: { "retry-after": "0", "content-type": "application/json" },
        }),
      { maxRetries: 1 },
    );
    const err = await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema }).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(0);
  });

  it("retries 503 then succeeds", async () => {
    let n = 0;
    const t = makeTransport(() => {
      n++;
      if (n === 1) return jsonResponse(503, { error: { code: "internal_error", message: "x", request_id: "r" } });
      return jsonResponse(200, { ok: true });
    }, { maxRetries: 2 });
    const r = await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema });
    expect(r).toEqual({ ok: true });
  });

  it("does not retry POST 5xx without idempotency key", async () => {
    let n = 0;
    const t = makeTransport(() => {
      n++;
      return jsonResponse(503, { error: { code: "internal_error", message: "x", request_id: "r" } });
    }, { maxRetries: 3 });
    await expect(
      t.request({ method: "POST", path: "/v1/messages", schema: OkSchema, body: { x: 1 } }),
    ).rejects.toBeInstanceOf(APIError);
    expect(n).toBe(1);
  });

  it("retries connection errors", async () => {
    let n = 0;
    const t = makeTransport(() => {
      n++;
      if (n === 1) throw new TypeError("fetch failed");
      return jsonResponse(200, { ok: true });
    }, { maxRetries: 2 });
    const r = await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema });
    expect(r).toEqual({ ok: true });
  });

  it("raises APIConnectionError when retries exhausted on network", async () => {
    const t = makeTransport(() => {
      throw new TypeError("fetch failed");
    }, { maxRetries: 1 });
    await expect(
      t.request({ method: "GET", path: "/v1/ping", schema: OkSchema }),
    ).rejects.toBeInstanceOf(APIConnectionError);
  });

  it("raises ValidationError when response fails schema", async () => {
    const t = makeTransport(() => jsonResponse(200, { wrong: "shape" }));
    await expect(t.request({ method: "GET", path: "/v1/ping", schema: OkSchema })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("does not retry when caller aborts", async () => {
    const controller = new AbortController();
    let callCount = 0;
    const t = makeTransport(() => {
      callCount++;
      // Simulate abort firing before fetch can resolve
      return new Promise<Response>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        }, { once: true });
      });
    }, { maxRetries: 3 });

    // Trigger abort synchronously before awaiting
    queueMicrotask(() => controller.abort());
    const err = await t.request({
      method: "GET",
      path: "/v1/ping",
      schema: OkSchema,
      signal: controller.signal,
    }).catch((e) => e);
    expect((err as Error).name).toBe("AbortError");
    expect(callCount).toBe(1); // no retries
  });

  it("appends userAgent suffix", async () => {
    let captured = "";
    const t = new Transport({
      apiKey: "k",
      baseUrl: "https://example.test",
      timeout: 5000,
      maxRetries: 0,
      userAgentSuffix: "myapp/1.2",
      version: "1.0.0",
      fetch: mockFetch((req) => {
        captured = req.headers.get("user-agent") ?? "";
        return jsonResponse(200, { ok: true });
      }),
    });
    await t.request({ method: "GET", path: "/v1/ping", schema: OkSchema });
    expect(captured).toBe("blueticks-node/1.0.0 myapp/1.2");
  });

  it("sends JSON body when body provided", async () => {
    let captured = "";
    const t = makeTransport(async (req) => {
      captured = await req.text();
      return jsonResponse(200, { ok: true });
    });
    await t.request({ method: "POST", path: "/v1/x", schema: OkSchema, body: { text: "hi" }, idempotencyKey: "k1" });
    expect(JSON.parse(captured)).toEqual({ text: "hi" });
  });
});
