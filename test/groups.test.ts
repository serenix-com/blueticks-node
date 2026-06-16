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

function baseGroup(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "120363000000000000@g.us",
    name: "Engineering",
    description: "Eng channel",
    owner: "15551230001@c.us",
    createdAt: "2026-04-23T10:00:00Z",
    lastMessageAt: "2026-04-23T11:00:00Z",
    participantCount: 3,
    announce: false,
    restrict: false,
    participants: [
      { chatId: "15551230001@c.us", isAdmin: true, isSuperAdmin: true, name: "Alice" },
      { chatId: "15551230002@c.us", isAdmin: false, isSuperAdmin: false, name: null },
    ],
    ...overrides,
  };
}

describe("client.groups.list", () => {
  it("GETs /v1/groups and returns Page<Group>", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/groups");
      return jsonResponse(200, {
        data: [baseGroup()],
        has_more: false,
        next_cursor: null,
      });
    });
    const page = await c.groups.list();
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.id).toBe("120363000000000000@g.us");
    expect(page.has_more).toBe(false);
  });

  it("passes q param for name search", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).searchParams.get("q")).toBe("Eng");
      return jsonResponse(200, { data: [], has_more: false, next_cursor: null });
    });
    const page = await c.groups.list({ q: "Eng" });
    expect(page.data).toHaveLength(0);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.groups.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });
});

describe("client.groups.create", () => {
  it("POSTs /v1/groups with name + participants and returns Group", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/groups");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        name: "Engineering",
        participants: ["15551230001@c.us", "+15551230002"],
      });
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.create({
      name: "Engineering",
      participants: ["15551230001@c.us", "+15551230002"],
    });
    expect(g.id).toBe("120363000000000000@g.us");
    expect(g.participants?.[0]?.isAdmin).toBe(true);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.groups
      .create({ name: "x", participants: ["a"] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.groups.create({ name: "x", participants: ["a"] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.groups.get", () => {
  it("GETs /v1/groups/:id and returns Group", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120363000000000000%40g.us");
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.get("120363000000000000@g.us");
    expect(g.name).toBe("Engineering");
    expect(g.participantCount).toBe(3);
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.groups.get("g1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.groups.update", () => {
  it("PATCHes /v1/groups/:id with name and settings", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/groups/g1");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ name: "Renamed", settings: { announce: true } });
      return jsonResponse(200, baseGroup({ name: "Renamed", announce: true }));
    });
    const g = await c.groups.update("g1", {
      name: "Renamed",
      settings: { announce: true },
    });
    expect(g.name).toBe("Renamed");
    expect(g.announce).toBe(true);
  });
});

describe("client.groups.addMember", () => {
  it("POSTs /v1/groups/:id/members with chatId", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/groups/g1/members");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({ chatId: "15551230003@c.us" });
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.addMember("g1", { chatId: "15551230003@c.us" });
    expect(g.id).toBe("120363000000000000@g.us");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.groups
      .addMember("g1", { chatId: "x@c.us" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe("client.groups.removeMember", () => {
  it("DELETEs /v1/groups/:id/members/:chatId", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe(
        "/v1/groups/g1/members/15551230002%40c.us",
      );
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.removeMember("g1", "15551230002@c.us");
    expect(g.participants).toHaveLength(2);
  });
});

describe("client.groups.promoteAdmin", () => {
  it("POSTs /v1/groups/:id/members/:chatId/admin", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe(
        "/v1/groups/g1/members/15551230002%40c.us/admin",
      );
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.promoteAdmin("g1", "15551230002@c.us");
    expect(g.id).toBe("120363000000000000@g.us");
  });
});

describe("client.groups.demoteAdmin", () => {
  it("DELETEs /v1/groups/:id/members/:chatId/admin", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe(
        "/v1/groups/g1/members/15551230002%40c.us/admin",
      );
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.demoteAdmin("g1", "15551230002@c.us");
    expect(g.id).toBe("120363000000000000@g.us");
  });
});

describe("client.groups.setPicture", () => {
  it("PUTs /v1/groups/:id/picture with fileDataUrl", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PUT");
      expect(new URL(req.url).pathname).toBe("/v1/groups/g1/picture");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body).toEqual({
        fileDataUrl: "data:image/png;base64,iVBOR...",
        fileName: "logo.png",
        fileMimeType: "image/png",
      });
      return jsonResponse(200, baseGroup());
    });
    const g = await c.groups.setPicture("g1", {
      fileDataUrl: "data:image/png;base64,iVBOR...",
      fileName: "logo.png",
      fileMimeType: "image/png",
    });
    expect(g.id).toBe("120363000000000000@g.us");
  });

  it("raises ValidationError when required field missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.groups.setPicture("g1", { fileDataUrl: "data:..." }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.groups.leave", () => {
  it("DELETEs /v1/groups/:id/members/me and returns void", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/groups/g1/members/me");
      return new Response(null, { status: 204 });
    });
    await expect(c.groups.leave("g1")).resolves.toBeUndefined();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.groups.leave("g1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});
