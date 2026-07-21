import { z, type ZodTypeAny } from "zod";

/**
 * Build a schema for the single-object success envelope `{ success: true,
 * data: <T> }`, unwrapping `data` so callers receive the bare model. Every
 * non-list v1 endpoint returns this envelope.
 */
export function dataEnvelope<T extends ZodTypeAny>(item: T) {
  return z
    .object({ success: z.literal(true), data: item })
    .transform((r) => r.data);
}

/**
 * Public offset-paginated list page. Every v1 list endpoint returns this
 * shape (after the `{ success, ... }` envelope is unwrapped). Iterate `data`
 * for the items on this page; advance by passing `skip: skip + limit` to the
 * next `list({ skip })` call, stopping once `skip + data.length >= total`.
 */
export interface Page<T> {
  data: T[];
  /** Page size echoed back from the request. */
  limit: number;
  /** Offset echoed back from the request. */
  skip: number;
  /** Total number of items matching the query, across all pages. */
  total: number;
}

/**
 * Build a schema for the `{ success, data, limit, skip, total }` list
 * envelope, stripping the `success` wrapper so callers receive a `Page<T>`.
 */
export function pageSchema<T extends ZodTypeAny>(item: T) {
  return z
    .object({
      success: z.literal(true),
      data: z.array(item),
      limit: z.number().int(),
      skip: z.number().int(),
      total: z.number().int(),
    })
    .transform(
      (r): Page<z.infer<T>> => ({
        data: r.data,
        limit: r.limit,
        skip: r.skip,
        total: r.total,
      }),
    );
}

/** Params accepted by every offset-paginated v1 list endpoint. */
export interface ListParams {
  /** Number of items to skip before the page (default 0). */
  skip?: number;
  /** Page size (1-200, default 50 server-side). */
  limit?: number;
}

export function buildListQuery(
  params: ListParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const q: Record<string, string | number | boolean | undefined> = {};
  if (params?.skip !== undefined) q.skip = params.skip;
  if (params?.limit !== undefined) q.limit = params.limit;
  return q;
}
