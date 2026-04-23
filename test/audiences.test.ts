import { describe, it, expect } from "vitest";
import { Blueticks } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

function baseAudience(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "aud_1",
    name: "VIPs",
    contact_count: 0,
    created_at: "2026-04-23T10:00:00Z",
    ...overrides,
  };
}

function baseContact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ct_1",
    to: "+15551230001",
    variables: {},
    added_at: "2026-04-23T10:00:00Z",
    ...overrides,
  };
}

describe("client.audiences", () => {
  it("create POSTs /v1/audiences", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/audiences");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ name: "VIPs" });
      return jsonResponse(200, baseAudience());
    });
    const a = await c.audiences.create({ name: "VIPs" });
    expect(a.id).toBe("aud_1");
  });

  it("list returns array", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/audiences");
      return jsonResponse(200, [baseAudience(), baseAudience({ id: "aud_2" })]);
    });
    const result = await c.audiences.list();
    expect(result).toHaveLength(2);
  });

  it("get with page passes ?page=N query", async () => {
    const c = mkClient((req) => {
      const u = new URL(req.url);
      expect(u.pathname).toBe("/v1/audiences/aud_1");
      expect(u.searchParams.get("page")).toBe("2");
      return jsonResponse(200, baseAudience({ page: 2, has_more: false, contacts: [] }));
    });
    const a = await c.audiences.get("aud_1", { page: 2 });
    expect(a.page).toBe(2);
  });

  it("update PATCHes", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ name: "Renamed" });
      return jsonResponse(200, baseAudience({ name: "Renamed" }));
    });
    const a = await c.audiences.update("aud_1", { name: "Renamed" });
    expect(a.name).toBe("Renamed");
  });

  it("delete returns void on 204", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      return new Response(null, { status: 204 });
    });
    await expect(c.audiences.delete("aud_1")).resolves.toBeUndefined();
  });

  it("appendContacts wraps array in { contacts }", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ contacts: [{ to: "+15551230002" }] });
      return jsonResponse(200, { added: 1, contact_count: 1 });
    });
    const r = await c.audiences.appendContacts("aud_1", [{ to: "+15551230002" }]);
    expect(r.added).toBe(1);
  });

  it("updateContact PATCHes nested contact", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts/ct_1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ variables: { name: "Ada" } });
      return jsonResponse(200, baseContact({ variables: { name: "Ada" } }));
    });
    const ct = await c.audiences.updateContact("aud_1", "ct_1", { variables: { name: "Ada" } });
    expect(ct.variables["name"]).toBe("Ada");
  });

  it("deleteContact returns void on 204", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts/ct_1");
      return new Response(null, { status: 204 });
    });
    await expect(c.audiences.deleteContact("aud_1", "ct_1")).resolves.toBeUndefined();
  });
});
