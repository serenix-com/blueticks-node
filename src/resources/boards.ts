import { BaseResource } from "../base-resource";
import {
  BoardSchema,
  BoardDetailSchema,
  BoardItemSchema,
  BulkItemsResultSchema,
  FindSimilarResultSchema,
  type Board,
  type BoardDetail,
  type BoardItem,
  type BulkItemsResult,
  type FindSimilarResult,
  type CellsMap,
  type ItemSource,
} from "../types/boards";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

/** Query accepted by `GET /v1/boards`. */
export interface ListBoardsParams extends ListParams {
  order?: "asc" | "desc";
}

/**
 * Body accepted by `POST /v1/boards`. Pass `domain` for a built-in board
 * (`tasks` / `leads` / `invoices`) or `entity_kind` to open a NEW dynamic board
 * (`description` is then required).
 */
export interface CreateBoardParams {
  domain?: string;
  entity_kind?: string;
  name?: string;
  description?: string;
  agent_id?: string;
  memory_retention_days?: number;
}

/** Query accepted by `GET /v1/boards/{boardId}/items`. */
export interface ListBoardItemsParams extends ListParams {
  status?: string;
  order?: "asc" | "desc";
  active_only?: boolean;
  updated_since?: string;
}

/** Body accepted by `POST /v1/boards/{boardId}/items` (and each entry of a bulk upsert). */
export interface CreateBoardItemParams {
  text: string;
  status?: string;
  priority?: string;
  due_date?: string;
  cells?: CellsMap;
  source?: ItemSource;
  confidence?: number;
  allow_duplicate?: boolean;
}

/** Body accepted by `PATCH /v1/boards/{boardId}/items/{itemId}`. */
export interface UpdateBoardItemParams {
  text?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  cells?: CellsMap;
  source?: ItemSource;
  confidence?: number;
  deleted?: boolean;
  note?: string;
}

/** Body accepted by `POST /v1/boards/{boardId}/items/bulk`. */
export interface BulkUpsertItemsParams {
  items: CreateBoardItemParams[];
  mode?: "upsert";
}

/** Body accepted by `POST /v1/boards/{boardId}/items/find-similar`. */
export interface FindSimilarItemsParams {
  candidates: { text: string }[];
}

const BoardPageSchema = pageSchema(BoardSchema);
const BoardItemPageSchema = pageSchema(BoardItemSchema);
const BoardDetailEnvelope = dataEnvelope(BoardDetailSchema);
const BoardItemEnvelope = dataEnvelope(BoardItemSchema);
const BulkItemsEnvelope = dataEnvelope(BulkItemsResultSchema);
const FindSimilarEnvelope = dataEnvelope(FindSimilarResultSchema);

export class BoardsResource extends BaseResource {
  /**
   * List boards.
   *
   * List boards, newest first. Filter by `domain` or `agent_managed`. Requires `boards:read`.
   */
  async list(params: ListBoardsParams & { signal?: AbortSignal } = {}): Promise<Page<Board>> {
    const { signal, order, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (order !== undefined) query.order = order;
    return this.client.request({
      method: "GET",
      path: "/v1/boards",
      query,
      schema: BoardPageSchema,
      signal,
    });
  }

  /**
   * Create or find board.
   *
   * Find-or-create the agent memory board for (`agent_id`, `domain`). Pass `domain` for a built-in board (`tasks`/`leads`/`invoices`) or `entity_kind` to open a NEW dynamic (`custom:<slug>`) board with a generic template — `description` is then required. Returns the existing board if one exists, else provisions it from the domain template. Requires `boards:write`.
   */
  async create(
    body: CreateBoardParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<BoardDetail> {
    return this.client.request({
      method: "POST",
      path: "/v1/boards",
      body,
      schema: BoardDetailEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Get board.
   *
   * Retrieve a board with its columns, options and item count. Requires `boards:read`.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<BoardDetail> {
    return this.client.request({
      method: "GET",
      path: `/v1/boards/${encodeURIComponent(id)}`,
      schema: BoardDetailEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * List board items.
   *
   * List a board's items (tasks). Pass `active_only=true` to return only items updated within the retention window whose status is non-terminal (the AI's "active memory" view). Filter by `status` label or `updated_since`. Requires `boards:read`.
   */
  async listItems(
    boardId: string,
    params: ListBoardItemsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<BoardItem>> {
    const { signal, status, order, active_only, updated_since, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (status !== undefined) query.status = status;
    if (order !== undefined) query.order = order;
    if (active_only !== undefined) query.active_only = active_only;
    if (updated_since !== undefined) query.updated_since = updated_since;
    return this.client.request({
      method: "GET",
      path: `/v1/boards/${encodeURIComponent(boardId)}/items`,
      query,
      schema: BoardItemPageSchema,
      signal,
    });
  }

  /**
   * Create board item.
   *
   * Create one item. `status`/`priority` are given as LABELS and resolved to the board's options server-side (unknown label → 422 with the valid labels). Dedupe fingerprint + provenance are stamped into aiMeta. Requires `boards:write`.
   */
  async createItem(
    boardId: string,
    body: CreateBoardItemParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<BoardItem> {
    return this.client.request({
      method: "POST",
      path: `/v1/boards/${encodeURIComponent(boardId)}/items`,
      body,
      schema: BoardItemEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Update board item.
   *
   * Update cells, soft-delete (`deleted:true`) or restore (`deleted:false`) an item. `note` is recorded in aiMeta.history. Requires `boards:write`.
   */
  async updateItem(
    boardId: string,
    itemId: string,
    body: UpdateBoardItemParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<BoardItem> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`,
      body,
      schema: BoardItemEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Bulk upsert board items.
   *
   * Create or merge many items in one call. Each item is fingerprinted and matched against the board's existing items — a match is patched (merging richer fields, bumping last-seen), a miss is created. Keeps scan-merge token cost flat. Requires `boards:write`.
   */
  async bulkUpsertItems(
    boardId: string,
    body: BulkUpsertItemsParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<BulkItemsResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/boards/${encodeURIComponent(boardId)}/items/bulk`,
      body,
      schema: BulkItemsEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Find similar board items.
   *
   * Server-side dedupe: match each candidate text against the board's items by normalized fingerprint + fuzzy token overlap, returning match pairs (and the misses). Use before creating to avoid duplicates. Requires `boards:read`.
   */
  async findSimilarItems(
    boardId: string,
    body: FindSimilarItemsParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<FindSimilarResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/boards/${encodeURIComponent(boardId)}/items/find-similar`,
      body,
      schema: FindSimilarEnvelope,
      signal: opts.signal,
    });
  }
}
