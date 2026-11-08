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
 * Which WhatsApp engine answered a read, and the account number it is bound
 * to. Present on list responses when the server includes it.
 */
export const AnsweredBySchema = z.object({
  engineId: z.string(),
  numberId: z.string().nullish(),
  phoneNumber: z.string().nullish(),
});

export type AnsweredBy = z.infer<typeof AnsweredBySchema>;

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
  /** Engine + number that answered the read, when the server reports it. */
  answeredBy?: AnsweredBy | null;
  /** Token for the next page (equal to the next `skip`), or null on the last page. */
  nextCursor?: string | null;
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
      answeredBy: AnsweredBySchema.nullish(),
      nextCursor: z.string().nullish(),
    })
    .transform((r): Page<z.infer<T>> => {
      const page: Page<z.infer<T>> = {
        data: r.data,
        limit: r.limit,
        skip: r.skip,
        total: r.total,
      };
      if (r.answeredBy !== undefined) page.answeredBy = r.answeredBy;
      if (r.nextCursor !== undefined) page.nextCursor = r.nextCursor;
      return page;
    });
}

/** Params accepted by every offset-paginated v1 list endpoint. */
export interface ListParams {
  /** Number of items to skip before the page (default 0). */
  skip?: number;
  /** Page size (1-200, default 50 server-side). */
  limit?: number;
}

/** Which engine type a read is forced to. */
export type EngineType = "gateway" | "regular";

/** Selects the engine (or the account number) a read is answered from. */
export interface EngineSelectorParams {
  /** Force the read to a specific engine type: `gateway` (server-side, e.g. Baileys) or `regular` (browser extension). */
  engine?: EngineType;
  /** Exact engine clientId to target; wins over `engine`. */
  engineId?: string;
  /** Target the engine on one of this account's WhatsApp numbers (the Number id). */
  numberId?: string;
}

/** Engine selection plus fan-out controls for reads that span all of an account's numbers. */
export interface EngineTargetParams extends EngineSelectorParams {
  /** Target one of this account's WhatsApp numbers by its E.164 phone. */
  phone?: string;
  /** With no number target, read at most this many of the account's numbers (default 5). */
  fanoutLimit?: number;
}

export function buildListQuery(
  params: ListParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const q: Record<string, string | number | boolean | undefined> = {};
  if (params?.skip !== undefined) q.skip = params.skip;
  if (params?.limit !== undefined) q.limit = params.limit;
  return q;
}

/** Serialize the engine-selection params onto a query object (only the fields that are set). */
export function addEngineTargetQuery(
  query: Record<string, string | number | boolean | undefined>,
  params: EngineTargetParams,
): Record<string, string | number | boolean | undefined> {
  if (params.engine !== undefined) query.engine = params.engine;
  if (params.engineId !== undefined) query.engineId = params.engineId;
  if (params.numberId !== undefined) query.numberId = params.numberId;
  if (params.phone !== undefined) query.phone = params.phone;
  if (params.fanoutLimit !== undefined) query.fanoutLimit = params.fanoutLimit;
  return query;
}

/**
 * Like {@link pageSchema}, for bounded batch/lookup endpoints that return a
 * bare array — `{ success: true, data: [...] }` with NO `limit`/`skip`/`total`
 * (e.g. `POST /v1/messages/acks`, `GET /v1/messages/pinned/{chatId}`). Also
 * accepts the paged shape, so it works against either server behavior. A bare
 * array is surfaced as a single complete `Page<T>` (`skip: 0`, `limit` and
 * `total` = the array length) so the public return type stays unchanged.
 */
export function arrayOrPageSchema<T extends ZodTypeAny>(item: T) {
  return z
    .object({
      success: z.literal(true),
      data: z.array(item),
      limit: z.number().int().optional(),
      skip: z.number().int().optional(),
      total: z.number().int().optional(),
    })
    .transform(
      (r): Page<z.infer<T>> => ({
        data: r.data,
        limit: r.limit ?? r.data.length,
        skip: r.skip ?? 0,
        total: r.total ?? r.data.length,
      }),
    );
}
