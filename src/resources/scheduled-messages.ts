import { BaseResource } from "../base-resource";
import {
  ScheduledMessageSchema,
  type ScheduledMessage,
} from "../types/scheduled-messages";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ScheduledMessagePageSchema = pageSchema(ScheduledMessageSchema);

/** Shared optional fields present on every send-message variant. */
export interface SendScheduledMessageCommon {
  to: string;
  send_at?: string;
  from?: string;
  reply_to?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** Send a plain-text message. */
export interface SendTextScheduledMessageParams extends SendScheduledMessageCommon {
  type: "text";
  text: string;
  link_preview?: boolean | {
    title: string;
    description?: string;
    canonical_url?: string;
    thumbnail?: string;
  };
}

/** Send a media message (image, video, audio, document, sticker, voice). */
export interface SendMediaScheduledMessageParams extends SendScheduledMessageCommon {
  type: "media";
  media: {
    url: string;
    kind?: "image" | "video" | "audio" | "document" | "sticker" | "voice";
    caption?: string;
    filename?: string;
  };
}

/** Send a poll message. */
export interface SendPollScheduledMessageParams extends SendScheduledMessageCommon {
  type: "poll";
  poll: {
    question: string;
    options: string[];
    allow_multiple?: boolean;
  };
}

export type SendScheduledMessageParams =
  | SendTextScheduledMessageParams
  | SendMediaScheduledMessageParams
  | SendPollScheduledMessageParams;

/** Subset of mutable fields accepted by `PATCH /v1/scheduled-messages/{id}`. */
export interface UpdateScheduledMessageParams {
  text?: string;
  media_url?: string;
  media_caption?: string;
  send_at?: string;
}

/** Optional filters accepted by `GET /v1/scheduled-messages`. */
export interface ListScheduledMessagesParams extends ListParams {
  chat_id?: string;
  status?: "scheduled" | "queued" | "sending" | "delivered" | "read" | "failed";
  q?: string;
}

export class ScheduledMessagesResource extends BaseResource {
  /**
   * List messages.
   *
   * List messages in the user-messages queue (all sources: API, dashboard, extension), newest first (cursor-paginated). Optionally filter by `chat_id` and/or lifecycle `status`.
   */
  async list(
    params: ListScheduledMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ScheduledMessage>> {
    const { signal, chat_id, status, q, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (chat_id !== undefined) query.chat_id = chat_id;
    if (status !== undefined) query.status = status;
    if (q !== undefined) query.q = q;
    return this.client.request({
      method: "GET",
      path: "/v1/scheduled-messages",
      query,
      schema: ScheduledMessagePageSchema,
      signal,
    });
  }

  /**
   * Send message.
   *
   * Send a message via WhatsApp. The body is a discriminated union — set the `type` field to one of `text`, `media`, or `poll`.
   */
  async create(params: SendScheduledMessageParams): Promise<ScheduledMessage> {
    const { idempotencyKey, signal, ...body } = params;
    return this.client.request({
      method: "POST",
      path: "/v1/scheduled-messages",
      schema: ScheduledMessageSchema,
      body,
      idempotencyKey,
      signal,
    });
  }

  /**
   * Get message.
   *
   * Get the current status of a message by ID.
   */
  async retrieve(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ScheduledMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      schema: ScheduledMessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Update message.
   *
   * Edit a previously-queued message that has not dispatched yet. Accepts a subset of `text`, `media_url`, `media_caption`, `send_at` — at least one is required. Returns 400 once the message has advanced past the editable window (status not in `pending`/`sending`).
   */
  async update(
    id: string,
    body: UpdateScheduledMessageParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ScheduledMessage> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      body,
      schema: ScheduledMessageSchema,
      signal: opts.signal,
    });
  }
}
