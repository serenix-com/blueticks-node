// test/errors.test.ts
import { describe, it, expect } from "vitest";
import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  BluetickError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  errorFromEnvelope,
} from "../src/errors";

describe("BluetickError", () => {
  it("is an Error", () => {
    const e = new BluetickError({ statusCode: 500, code: "internal_error", message: "boom", requestId: "r" });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(BluetickError);
  });

  it("renders status, code, message, request_id in the message", () => {
    const e = new BluetickError({ statusCode: 401, code: "authentication_required", message: "bad key", requestId: "req_1" });
    expect(e.message).toBe("401 authentication_required: bad key (request_id=req_1)");
  });

  it("handles missing requestId", () => {
    const e = new BluetickError({ statusCode: 500, code: "internal_error", message: "boom", requestId: null });
    expect(e.message).toContain("request_id=null");
  });
});

describe("typed subclasses", () => {
  it.each([
    [AuthenticationError],
    [PermissionDeniedError],
    [NotFoundError],
    [BadRequestError],
    [RateLimitError],
    [APIError],
    [APIConnectionError],
  ])("%p extends BluetickError", (Cls) => {
    const e = new Cls({ statusCode: 400, code: "x", message: "y", requestId: null });
    expect(e).toBeInstanceOf(BluetickError);
  });
});

describe("errorFromEnvelope", () => {
  it.each([
    [401, "authentication_required", AuthenticationError],
    [403, "permission_denied", PermissionDeniedError],
    [404, "not_found", NotFoundError],
    [400, "invalid_request", BadRequestError],
    [422, "invalid_request", BadRequestError],
    [429, "rate_limited", RateLimitError],
    [500, "internal_error", APIError],
    [503, "internal_error", APIError],
  ])("status %i → %s maps to typed exception", (status, code, Cls) => {
    const e = errorFromEnvelope({
      statusCode: status,
      body: { error: { code, message: "m", request_id: "r" } },
      response: null,
    });
    expect(e).toBeInstanceOf(Cls);
    expect(e.statusCode).toBe(status);
    expect(e.code).toBe(code);
    expect(e.requestId).toBe("r");
  });

  it("falls back to APIError when envelope is missing", () => {
    const e = errorFromEnvelope({ statusCode: 502, body: { weird: "shape" }, response: null });
    expect(e).toBeInstanceOf(APIError);
    expect(e.code).toBeNull();
    expect(e.message).toContain("weird");
  });

  it("truncates long fallback bodies", () => {
    const big = "x".repeat(500);
    const e = errorFromEnvelope({ statusCode: 500, body: big, response: null });
    expect(e.message.length).toBeLessThanOrEqual(210);
    expect(e.message.endsWith("...")).toBe(true);
  });

  it("attaches details from envelope when present", () => {
    const e = errorFromEnvelope({
      statusCode: 400,
      body: {
        error: {
          code: "invalid_request",
          message: "contacts.0.to: Invalid",
          request_id: "r",
          details: [
            { path: "contacts.0.to", code: "invalid_string", message: "must be E.164" },
          ],
        },
      },
      response: null,
    });
    expect(e.details).toEqual([
      { path: "contacts.0.to", code: "invalid_string", message: "must be E.164" },
    ]);
  });

  it("leaves details=null when the envelope has none", () => {
    const e = errorFromEnvelope({
      statusCode: 400,
      body: { error: { code: "invalid_request", message: "x", request_id: "r" } },
      response: null,
    });
    expect(e.details).toBeNull();
  });

  it("ignores non-array details payloads", () => {
    const e = errorFromEnvelope({
      statusCode: 400,
      body: { error: { code: "invalid_request", message: "x", request_id: "r", details: "oops" } },
      response: null,
    });
    expect(e.details).toBeNull();
  });

  it("attaches retryAfter to RateLimitError", () => {
    const e = errorFromEnvelope({
      statusCode: 429,
      body: { error: { code: "rate_limited", message: "slow", request_id: "r" } },
      response: null,
      retryAfter: 30,
    });
    expect(e).toBeInstanceOf(RateLimitError);
    expect((e as RateLimitError).retryAfter).toBe(30);
  });
});
