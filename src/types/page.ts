import { z, type ZodTypeAny } from "zod";

/**
 * Public cursor-paginated list envelope. Every v1 list endpoint returns
 * this shape. Iterate `data` for items on this page; pass `next_cursor`
 * as the `cursor` param of the next `list({ cursor })` call to continue.
 * When there are no more rows, `has_more` is `false` and `next_cursor`
 * is `null`.
 */
export interface Page<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Build a Zod schema for a `Page<T>` response given the item schema. */
export function pageSchema<T extends ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  });
}

/** Params accepted by every v1 list endpoint. */
export interface ListParams {
  /** Page size; 1-200. Defaults to 50 server-side. */
  limit?: number;
  /** Opaque cursor from a previous Page's `next_cursor`. */
  cursor?: string;
}

export function buildListQuery(params: ListParams | undefined): Record<string, string> {
  const q: Record<string, string> = {};
  if (params?.limit !== undefined) q.limit = String(params.limit);
  if (params?.cursor) q.cursor = params.cursor;
  return q;
}
