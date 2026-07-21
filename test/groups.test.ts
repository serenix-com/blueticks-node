import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const GROUP = {
  id: "120@g.us",
  name: "Team",
  description: "our group",
  owner: "111@c.us",
  createdAt: "2026-04-22T10:00:00Z",
  participantCount: 3,
  announce: false,
  restrict: false,
  participants: [{ chatId: "111@c.us", isAdmin: true, isSuperAdmin: true, name: "Ann" }],
};

describe("client.groups.list", () => {
  it("returns a Page<GroupListItem>", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/groups");
      expect(url.searchParams.get("searchToken")).toBe("team");
      return jsonResponse(200, {
        success: true,
        data: [{ id: "120@g.us", name: "Team", participantCount: 3 }],
        limit: 50,
        skip: 0,
        total: 1,
      });
    });
    const page = await c.groups.list({ searchToken: "team" });
    expect(page.data[0]!.id).toBe("120@g.us");
    expect(page.data[0]!.participantCount).toBe(3);
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.groups.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.groups.create/get/update", () => {
  it("create posts name + participants", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      const body = await req.json();
      expect(body).toEqual({ name: "Team", participants: ["111@c.us"] });
      return jsonResponse(200, { success: true, data: GROUP });
    });
    const res = await c.groups.create({ name: "Team", participants: ["111@c.us"] });
    expect(res.id).toBe("120@g.us");
    expect(res.participants?.[0]!.isSuperAdmin).toBe(true);
  });

  it("get passes include=participants", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/groups/120%40g.us");
      expect(url.searchParams.get("include")).toBe("participants");
      return jsonResponse(200, { success: true, data: GROUP });
    });
    const res = await c.groups.get("120@g.us", { include: "participants" });
    expect(res.name).toBe("Team");
  });

  it("update sends settings", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      const body = await req.json();
      expect(body).toEqual({ settings: { announce: true } });
      return jsonResponse(200, { success: true, data: { ...GROUP, announce: true } });
    });
    const res = await c.groups.update("120@g.us", { settings: { announce: true } });
    expect(res.announce).toBe(true);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_g" } }),
    );
    const err = await c.groups.get("120@g.us").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_g");
  });
});

describe("client.groups members", () => {
  it("addMembers posts participants", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/members");
      const body = await req.json();
      expect(body).toEqual({ participants: ["222@c.us"] });
      return jsonResponse(200, { success: true, data: GROUP });
    });
    const res = await c.groups.addMembers("120@g.us", { participants: ["222@c.us"] });
    expect(res.id).toBe("120@g.us");
  });

  it("removeMember DELETEs the member", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/members/222%40c.us");
      return jsonResponse(200, { success: true, data: GROUP });
    });
    const res = await c.groups.removeMember("120@g.us", "222@c.us");
    expect(res.id).toBe("120@g.us");
  });

  it("promoteAdmin / demoteAdmin hit the admin sub-path", async () => {
    const cp = mkClient((req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/members/222%40c.us/admin");
      return jsonResponse(200, { success: true, data: GROUP });
    });
    expect((await cp.groups.promoteAdmin("120@g.us", "222@c.us")).id).toBe("120@g.us");

    const cd = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/members/222%40c.us/admin");
      return jsonResponse(200, { success: true, data: GROUP });
    });
    expect((await cd.groups.demoteAdmin("120@g.us", "222@c.us")).id).toBe("120@g.us");
  });

  it("leave resolves on 204", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("DELETE");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/members/me");
      return new Response(null, { status: 204 });
    });
    await expect(c.groups.leave("120@g.us")).resolves.toBeUndefined();
  });

  it("setPicture PUTs the image body", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PUT");
      expect(new URL(req.url).pathname).toBe("/v1/groups/120%40g.us/picture");
      const body = await req.json();
      expect(body).toEqual({ url: "https://cdn.test/pic.jpg" });
      return jsonResponse(200, { success: true, data: GROUP });
    });
    const res = await c.groups.setPicture("120@g.us", { url: "https://cdn.test/pic.jpg" });
    expect(res.id).toBe("120@g.us");
  });
});
