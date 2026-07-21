import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const AUDIENCE = {
  id: "aud_1",
  name: "Leads",
  contactCount: 42,
  createdAt: "2026-04-22T10:00:00Z",
};

describe("client.audiences.list", () => {
  it("returns a Page<Audience>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/audiences");
      expect(url.searchParams.get("order")).toBe("asc");
      return jsonResponse(200, { success: true, data: [AUDIENCE], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.audiences.list({ order: "asc" });
    expect(page.data[0]!.id).toBe("aud_1");
    expect(page.data[0]!.contactCount).toBe(42);
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.audiences.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.audiences.create", () => {
  it("posts and returns the audience", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/audiences");
      const body = await req.json();
      expect(body.name).toBe("Leads");
      return jsonResponse(200, { success: true, data: { ...AUDIENCE, contactCount: 0 } });
    });
    const res = await c.audiences.create({ name: "Leads" });
    expect(res.contactCount).toBe(0);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_au" } }),
    );
    const err = await c.audiences.create({ name: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_au");
  });
});

describe("client.audiences.get/update/delete", () => {
  it("get returns an audience", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1");
      return jsonResponse(200, { success: true, data: AUDIENCE });
    });
    const res = await c.audiences.get("aud_1");
    expect(res.name).toBe("Leads");
  });

  it("update renames", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      const body = await req.json();
      expect(body).toEqual({ name: "Renamed" });
      return jsonResponse(200, { success: true, data: { ...AUDIENCE, name: "Renamed" } });
    });
    const res = await c.audiences.update("aud_1", { name: "Renamed" });
    expect(res.name).toBe("Renamed");
  });

  it("delete returns { id, deleted: true }", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      return jsonResponse(200, { success: true, data: { id: "aud_1", deleted: true } });
    });
    const res = await c.audiences.delete("aud_1");
    expect(res.deleted).toBe(true);
  });
});

describe("client.audiences contacts", () => {
  it("appendContacts returns counts", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts");
      const body = await req.json();
      expect(body.contacts).toHaveLength(1);
      return jsonResponse(200, { success: true, data: { added: 1, contactCount: 43 } });
    });
    const res = await c.audiences.appendContacts("aud_1", [{ to: "+14155551234" }]);
    expect(res.added).toBe(1);
    expect(res.contactCount).toBe(43);
  });

  it("updateContact returns the row", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts/ct_1");
      return jsonResponse(200, {
        success: true,
        data: { id: "ct_1", to: "+14155551234", variables: { firstName: "Jane" }, addedAt: "2026-04-22T10:00:00Z" },
      });
    });
    const res = await c.audiences.updateContact("aud_1", "ct_1", { variables: { firstName: "Jane" } });
    expect(res.variables.firstName).toBe("Jane");
  });

  it("deleteContact returns { id }", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/audiences/aud_1/contacts/ct_1");
      return jsonResponse(200, { success: true, data: { id: "ct_1" } });
    });
    const res = await c.audiences.deleteContact("aud_1", "ct_1");
    expect(res.id).toBe("ct_1");
  });
});
