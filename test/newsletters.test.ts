import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({
    apiKey: "bt_test_x",
    baseUrl: "https://example.test",
    fetch: mockFetch(handler),
  });
}

function authErr() {
  return jsonResponse(401, {
    error: { code: "authentication_required", message: "bad key", requestId: "req_a" },
  });
}

const fullNewsletter = {
  id: "120363201733549020@newsletter",
  name: "Acme Updates",
  description: "Weekly news from Acme Corp.",
  owner: "15551234567@s.whatsapp.net",
  createdAt: "2026-01-15T09:00:00Z",
  subscribers: 412,
  invite: "AbCdEfGhIjKlMn",
  verification: "VERIFIED",
};

describe("client.newsletters.list", () => {
  it("GETs /v1/newsletters and returns Page<Newsletter>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/newsletters");
      return jsonResponse(200, {
        data: [fullNewsletter],
        has_more: false,
        next_cursor: null,
      });
    });
    const page = await c.newsletters.list({ limit: 10 });
    expect(page.data).toHaveLength(1);
    expect(page.data[0]!.id).toBe("120363201733549020@newsletter");
    expect(page.data[0]!.name).toBe("Acme Updates");
    expect(page.data[0]!.verification).toBe("VERIFIED");
    expect(page.has_more).toBe(false);
    expect(page.next_cursor).toBeNull();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.newsletters.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when envelope is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.newsletters.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.newsletters.create", () => {
  it("POSTs /v1/newsletters and returns Newsletter", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/newsletters");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ name: "Acme Updates", description: "Weekly news" });
      return jsonResponse(201, fullNewsletter);
    });
    const n = await c.newsletters.create({
      name: "Acme Updates",
      description: "Weekly news",
    });
    expect(typeof n.id).toBe("string");
    expect(n.id).toBe("120363201733549020@newsletter");
    expect(n.name).toBe("Acme Updates");
    expect(n.subscribers).toBe(412);
    expect(n.verification).toBe("VERIFIED");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.newsletters.create({ name: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.newsletters.create({ name: "x" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.newsletters.retrieve", () => {
  it("GETs /v1/newsletters/:id and returns Newsletter", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/newsletters/120363201733549020@newsletter");
      return jsonResponse(200, fullNewsletter);
    });
    const n = await c.newsletters.retrieve("120363201733549020@newsletter");
    expect(n.id).toBe("120363201733549020@newsletter");
    expect(n.description).toBe("Weekly news from Acme Corp.");
    expect(n.invite).toBe("AbCdEfGhIjKlMn");
    expect(n.verification).toBe("VERIFIED");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.newsletters.retrieve("120363201733549020@newsletter").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.newsletters.retrieve("120363201733549020@newsletter"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
