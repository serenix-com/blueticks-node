import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const AUTH_ERR = (id: string) =>
  jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: id } });

const BOARD = {
  board_id: "brd_1",
  name: "Leads",
  description: "Sales leads",
  domain: "leads",
  agent_managed: true,
  memory_retention_days: 90,
  item_count: 4,
  web_url: "https://app.blueticks.co/boards/brd_1",
  created_at: "2026-04-22T10:00:00Z",
  updated_at: "2026-04-23T10:00:00Z",
};

const BOARD_DETAIL = {
  ...BOARD,
  columns: [
    { column_id: "c1", title: "Status", type: "status", options: [{ label: "Open", bgcolor: "#00f" }] },
    { column_id: "c2", title: "Company", type: "text", options: [] },
  ],
};

const ITEM = {
  item_id: "itm_1",
  text: "Call Dana",
  status: { label: "Open", bgcolor: "#00f" },
  priority: { label: "High", bgcolor: "#f00" },
  due_date: "2026-05-01",
  cells: { Company: "Acme", Value: 1200 },
  source: { chat_id: "120@g.us", chat_name: "Team", message_key: "k1", excerpt: "x", extracted_at: 1714000000000 },
  confidence: 0.8,
  last_seen_at: 1714000000000,
  web_url: "https://app.blueticks.co/boards/brd_1/itm_1",
  created_at: "2026-04-22T10:00:00Z",
  updated_at: "2026-04-23T10:00:00Z",
};

describe("client.boards.list", () => {
  it("returns a Page<Board> and forwards order/skip/limit", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(req.method).toBe("GET");
      expect(url.pathname).toBe("/v1/boards");
      expect(url.searchParams.get("order")).toBe("asc");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("skip")).toBe("5");
      return jsonResponse(200, { success: true, data: [BOARD], limit: 10, skip: 5, total: 6 });
    });
    const page = await c.boards.list({ order: "asc", limit: 10, skip: 5 });
    expect(page.total).toBe(6);
    expect(page.data[0]!.board_id).toBe("brd_1");
    expect(page.data[0]!.agent_managed).toBe(true);
    expect(page.data[0]!.created_at).toBe("2026-04-22T10:00:00Z");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b1"));
    const err = await c.boards.list().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.message).toContain("no");
    expect(err.requestId).toBe("req_b1");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.list()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.create", () => {
  it("posts the body and returns the BoardDetail", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/boards");
      expect(await req.json()).toEqual({ domain: "leads", agent_id: "bot:1", memory_retention_days: 90 });
      return jsonResponse(200, { success: true, data: BOARD_DETAIL });
    });
    const res = await c.boards.create({ domain: "leads", agent_id: "bot:1", memory_retention_days: 90 });
    expect(res.columns).toHaveLength(2);
    expect(res.columns[0]!.options[0]!.label).toBe("Open");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b2"));
    const err = await c.boards.create({ domain: "tasks" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b2");
  });

  it("raises ValidationError when required fields are missing", async () => {
    const c = mkClient(() => jsonResponse(200, { success: true, data: {} }));
    await expect(c.boards.create({ domain: "tasks" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.get", () => {
  it("returns BoardDetail and encodes the id", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/boards/brd%2F1");
      return jsonResponse(200, { success: true, data: BOARD_DETAIL });
    });
    const res = await c.boards.get("brd/1");
    expect(res.name).toBe("Leads");
    expect(res.item_count).toBe(4);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b3"));
    const err = await c.boards.get("brd_1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b3");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.get("brd_1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.listItems", () => {
  it("returns a Page<BoardItem> and forwards snake_case filters", async () => {
    const c = mkClient((req) => {
      const url = new URL(req.url);
      expect(url.pathname).toBe("/v1/boards/brd_1/items");
      expect(url.searchParams.get("status")).toBe("Open");
      expect(url.searchParams.get("active_only")).toBe("true");
      expect(url.searchParams.get("updated_since")).toBe("2026-04-01T00:00:00Z");
      expect(url.searchParams.get("order")).toBe("desc");
      return jsonResponse(200, { success: true, data: [ITEM], limit: 50, skip: 0, total: 1 });
    });
    const page = await c.boards.listItems("brd_1", {
      status: "Open",
      active_only: true,
      updated_since: "2026-04-01T00:00:00Z",
      order: "desc",
    });
    expect(page.data[0]!.item_id).toBe("itm_1");
    expect(page.data[0]!.status?.label).toBe("Open");
    expect(page.data[0]!.cells).toEqual({ Company: "Acme", Value: 1200 });
    expect(page.data[0]!.source?.extracted_at).toBe(1714000000000);
  });

  it("accepts items with only the required fields", async () => {
    const minimal = {
      item_id: "itm_2",
      text: "t",
      web_url: "https://x.test/i",
      created_at: "2026-04-22T10:00:00Z",
      updated_at: "2026-04-22T10:00:00Z",
    };
    const c = mkClient(() => jsonResponse(200, { success: true, data: [minimal], limit: 50, skip: 0, total: 1 }));
    const page = await c.boards.listItems("brd_1");
    expect(page.data[0]!.status).toBeUndefined();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b4"));
    const err = await c.boards.listItems("brd_1").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b4");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.listItems("brd_1")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.createItem", () => {
  it("posts the item body and returns the BoardItem", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/boards/brd_1/items");
      expect(await req.json()).toEqual({ text: "Call Dana", status: "Open", allow_duplicate: true });
      return jsonResponse(201, { success: true, data: ITEM });
    });
    const res = await c.boards.createItem("brd_1", { text: "Call Dana", status: "Open", allow_duplicate: true });
    expect(res.item_id).toBe("itm_1");
    expect(res.priority?.bgcolor).toBe("#f00");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b5"));
    const err = await c.boards.createItem("brd_1", { text: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b5");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(201, {}));
    await expect(c.boards.createItem("brd_1", { text: "x" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.updateItem", () => {
  it("PATCHes the item and returns it", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("PATCH");
      expect(new URL(req.url).pathname).toBe("/v1/boards/brd_1/items/itm_1");
      expect(await req.json()).toEqual({ deleted: true, note: "done" });
      return jsonResponse(200, { success: true, data: ITEM });
    });
    const res = await c.boards.updateItem("brd_1", "itm_1", { deleted: true, note: "done" });
    expect(res.text).toBe("Call Dana");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b6"));
    const err = await c.boards.updateItem("brd_1", "itm_1", { text: "y" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b6");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.updateItem("brd_1", "itm_1", { text: "y" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.boards.bulkUpsertItems", () => {
  it("posts items and returns the merge report", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/boards/brd_1/items/bulk");
      expect(await req.json()).toEqual({ items: [{ text: "a" }, { text: "b" }], mode: "upsert" });
      return jsonResponse(200, {
        success: true,
        data: {
          created: [ITEM],
          updated: [],
          unchanged: 1,
          board: { board_id: "brd_1", name: "Leads", web_url: "https://app.blueticks.co/boards/brd_1" },
        },
      });
    });
    const res = await c.boards.bulkUpsertItems("brd_1", { items: [{ text: "a" }, { text: "b" }], mode: "upsert" });
    expect(res.created).toHaveLength(1);
    expect(res.unchanged).toBe(1);
    expect(res.board.board_id).toBe("brd_1");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b7"));
    const err = await c.boards.bulkUpsertItems("brd_1", { items: [{ text: "a" }] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b7");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.bulkUpsertItems("brd_1", { items: [{ text: "a" }] })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("client.boards.findSimilarItems", () => {
  it("posts candidates and returns matches + misses", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/boards/brd_1/items/find-similar");
      expect(await req.json()).toEqual({ candidates: [{ text: "Call Dana" }, { text: "zzz" }] });
      return jsonResponse(200, {
        success: true,
        data: { matches: [{ candidate_index: 0, item_id: "itm_1", text: "Call Dana", score: 0.92 }], misses: [1] },
      });
    });
    const res = await c.boards.findSimilarItems("brd_1", { candidates: [{ text: "Call Dana" }, { text: "zzz" }] });
    expect(res.matches[0]!.score).toBe(0.92);
    expect(res.misses).toEqual([1]);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => AUTH_ERR("req_b8"));
    const err = await c.boards.findSimilarItems("brd_1", { candidates: [{ text: "a" }] }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_b8");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.boards.findSimilarItems("brd_1", { candidates: [{ text: "a" }] })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
