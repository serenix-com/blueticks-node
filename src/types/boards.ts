import { z } from "zod";

/** A selectable option (status / priority label) with its display colour. */
export const BoardOptionSchema = z.object({
  label: z.string(),
  bgcolor: z.string(),
});

export type BoardOption = z.infer<typeof BoardOptionSchema>;

/** A board column with its selectable options (empty for non-select columns). */
export const BoardColumnSchema = z.object({
  column_id: z.string(),
  title: z.string(),
  type: z.string(),
  options: z.array(BoardOptionSchema),
});

export type BoardColumn = z.infer<typeof BoardColumnSchema>;

/** A board as returned by `GET /v1/boards`. */
export const BoardSchema = z.object({
  board_id: z.string(),
  name: z.string(),
  /** One-line board purpose (subtitle + agent board-directory line). */
  description: z.string().nullish(),
  domain: z.string().nullish(),
  agent_managed: z.boolean(),
  memory_retention_days: z.number().int().nullish(),
  item_count: z.number().int().nullish(),
  web_url: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type Board = z.infer<typeof BoardSchema>;

/** A board with its columns and options (`GET /v1/boards/{id}`, `POST /v1/boards`). */
export const BoardDetailSchema = BoardSchema.extend({
  columns: z.array(BoardColumnSchema),
});

export type BoardDetail = z.infer<typeof BoardDetailSchema>;

/** Slim board reference returned alongside a bulk upsert. */
export const BoardRefSchema = z.object({
  board_id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  domain: z.string().nullish(),
  web_url: z.string(),
});

export type BoardRef = z.infer<typeof BoardRefSchema>;

/** Custom cell values keyed by column title (e.g. `Source`, `Company`, `Value`). */
export const CellsMapSchema = z.record(z.union([z.string(), z.number()]));

export type CellsMap = z.infer<typeof CellsMapSchema>;

/** Provenance of an item: the WhatsApp message it was extracted from. */
export const ItemSourceSchema = z.object({
  chat_id: z.string().nullish(),
  chat_name: z.string().nullish(),
  message_key: z.string().nullish(),
  excerpt: z.string().nullish(),
  /** Extraction time (epoch ms). */
  extracted_at: z.number().int().nullish(),
});

export type ItemSource = z.infer<typeof ItemSourceSchema>;

/** A board item (task / lead / invoice ...). */
export const BoardItemSchema = z.object({
  item_id: z.string(),
  text: z.string(),
  status: BoardOptionSchema.nullish(),
  priority: BoardOptionSchema.nullish(),
  due_date: z.string().nullish(),
  cells: CellsMapSchema.nullish(),
  source: ItemSourceSchema.nullish(),
  confidence: z.number().nullish(),
  last_seen_at: z.number().int().nullish(),
  web_url: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type BoardItem = z.infer<typeof BoardItemSchema>;

/** Response of `POST /v1/boards/{boardId}/items/bulk`. */
export const BulkItemsResultSchema = z.object({
  created: z.array(BoardItemSchema),
  updated: z.array(BoardItemSchema),
  /** Number of items that matched an existing item with nothing new to merge. */
  unchanged: z.number().int(),
  board: BoardRefSchema,
});

export type BulkItemsResult = z.infer<typeof BulkItemsResultSchema>;

/** One candidate that matched an existing item. */
export const SimilarItemMatchSchema = z.object({
  candidate_index: z.number().int(),
  item_id: z.string(),
  text: z.string(),
  score: z.number(),
});

export type SimilarItemMatch = z.infer<typeof SimilarItemMatchSchema>;

/** Response of `POST /v1/boards/{boardId}/items/find-similar`. */
export const FindSimilarResultSchema = z.object({
  matches: z.array(SimilarItemMatchSchema),
  /** Indexes of candidates with no match. */
  misses: z.array(z.number().int()),
});

export type FindSimilarResult = z.infer<typeof FindSimilarResultSchema>;
