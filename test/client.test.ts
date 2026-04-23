// test/client.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { Blueticks } from "../src/client";
import { BluetickError } from "../src/errors";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("Blueticks constructor", () => {
  it("accepts apiKey option", () => {
    delete process.env.BLUETICKS_API_KEY;
    const c = new Blueticks({ apiKey: "bt_live_x" });
    expect(c).toBeInstanceOf(Blueticks);
  });

  it("falls back to BLUETICKS_API_KEY env var", () => {
    process.env.BLUETICKS_API_KEY = "bt_test_env";
    const c = new Blueticks();
    expect(c).toBeInstanceOf(Blueticks);
  });

  it("throws BluetickError when no key anywhere", () => {
    delete process.env.BLUETICKS_API_KEY;
    expect(() => new Blueticks()).toThrow(BluetickError);
  });

  it("BLUETICKS_BASE_URL env overrides default", async () => {
    process.env.BLUETICKS_API_KEY = "k";
    process.env.BLUETICKS_BASE_URL = "https://staging.example.test";
    let gotUrl = "";
    const c = new Blueticks({
      fetch: mockFetch((req) => {
        gotUrl = req.url;
        return jsonResponse(200, { account_id: "a", key_prefix: "p1234567", scopes: [] });
      }),
    });
    await c.ping();
    expect(gotUrl).toContain("https://staging.example.test/v1/ping");
  });

  it("explicit baseUrl overrides env", async () => {
    process.env.BLUETICKS_API_KEY = "k";
    process.env.BLUETICKS_BASE_URL = "https://env.example.test";
    let gotUrl = "";
    const c = new Blueticks({
      baseUrl: "https://explicit.example.test",
      fetch: mockFetch((req) => {
        gotUrl = req.url;
        return jsonResponse(200, { account_id: "a", key_prefix: "p1234567", scopes: [] });
      }),
    });
    await c.ping();
    expect(gotUrl).toContain("https://explicit.example.test/v1/ping");
  });

  it("default baseUrl is api.blueticks.co", () => {
    delete process.env.BLUETICKS_BASE_URL;
    const c = new Blueticks({ apiKey: "k" });
    // Internal check — exposed via a minor getter for tests
    expect((c as unknown as { baseUrl: string }).baseUrl).toBe("https://api.blueticks.co");
  });

  it("exposes VERSION in user-agent", async () => {
    process.env.BLUETICKS_API_KEY = "k";
    let ua = "";
    const c = new Blueticks({
      fetch: mockFetch((req) => {
        ua = req.headers.get("user-agent") ?? "";
        return jsonResponse(200, { account_id: "a", key_prefix: "p1234567", scopes: [] });
      }),
    });
    await c.ping();
    expect(ua).toContain("blueticks-node/1.1.0");
  });

  it("appends userAgent suffix", async () => {
    process.env.BLUETICKS_API_KEY = "k";
    let ua = "";
    const c = new Blueticks({
      userAgent: "myapp/1.2",
      fetch: mockFetch((req) => {
        ua = req.headers.get("user-agent") ?? "";
        return jsonResponse(200, { account_id: "a", key_prefix: "p1234567", scopes: [] });
      }),
    });
    await c.ping();
    expect(ua).toBe("blueticks-node/1.1.0 myapp/1.2");
  });
});
