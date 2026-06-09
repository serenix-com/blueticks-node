import { BaseResource } from "../base-resource";
import {
  ScheduledMessageSchema,
  type ScheduledMessage,
} from "../types/scheduled-messages";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ScheduledMessagePageSchema = pageSchema(ScheduledMessageSchema);

/**
 * Flat body for `POST /v1/scheduled-messages` (`SendMessageRequest`). `type`
 * is a required validation-only discriminator (`text` | `media` | `poll`);
 * the media/poll fields are flat (e.g. `mediaUrl`, `pollOptions`) and `text`
 * doubles as the media caption. `idempotencyKey` and `signal` are SDK call
 * options stripped before the request body.
 */
export interface SendScheduledMessageParams {
  /** Validation discriminator: which family of fields is required. */
  type: "text" | "media" | "poll";
  /** Recipient (phone in E.164, JID, or chat id). */
  to: string;
  /** Schedule the send for a future ISO 8601 datetime. Omit to send now. */
  sendAt?: string;
  /** Text body (type=text) or media caption (type=media). 1–4096 chars. */
  text?: string;
  /** Bare URL shortcut for text sends — sends the URL and force-enables link preview. */
  url?: string;
  /**
   * Controls the rich-preview card under a URL. `true` (default) auto-fetches
   * when a URL is present, `false` never attaches one, an object is used verbatim.
   */
  linkPreview?:
    | boolean
    | {
        title: string;
        description?: string;
        canonicalUrl?: string;
        thumbnail?: string;
      };
  /** Media source URL (https only). Exactly one of mediaUrl / mediaDataBase64 for media sends. */
  mediaUrl?: string;
  /** Raw media bytes, base64-encoded. Alternative to `mediaUrl`. */
  mediaDataBase64?: string;
  /** Media kind. Optional — falls back to engine auto-detection. */
  mediaKind?: "image" | "video" | "audio" | "document" | "sticker" | "voice" | "gif";
  /** Filename to attach to the media (type=media). */
  mediaFilename?: string;
  /** Poll question (type=poll). Required for poll sends. */
  pollQuestion?: string;
  /** Poll options (type=poll). 2–12 items. */
  pollOptions?: string[];
  /** Allow selecting multiple poll options (type=poll). Default false. */
  pollAllowMultiple?: boolean;
  /** Sender number in E.164 form, when the account has multiple connections. */
  from?: string;
  /** Wire `key` of a prior message to quote-reply (from MessageResponse.key). */
  replyTo?: string;
  /** JIDs to mention. `displays` is the rendered name list. */
  mentions?: {
    ids: string[];
    displays?: string[];
  };
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** Subset of mutable fields accepted by `PATCH /v1/scheduled-messages/{id}`. */
export interface UpdateScheduledMessageParams {
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  sendAt?: string;
}

/** Optional filters accepted by `GET /v1/scheduled-messages`. */
export interface ListScheduledMessagesParams extends ListParams {
  chatId?: string;
  status?: "scheduled" | "queued" | "sending" | "delivered" | "read" | "failed";
  q?: string;
}

export class ScheduledMessagesResource extends BaseResource {
  /**
   * List messages.
   *
   * List messages in the user-messages queue (all sources: API, dashboard, extension), newest first (cursor-paginated). Optionally filter by `chatId` and/or lifecycle `status`.
   */
  async list(
    params: ListScheduledMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ScheduledMessage>> {
    const { signal, chatId, status, q, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (chatId !== undefined) query.chatId = chatId;
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
   * Schedule message.
   *
   * Send a message via WhatsApp. The body is flat — set `type` to one of `text`, `media`, or `poll`, then supply the matching fields (`text`, `mediaUrl`/`mediaDataBase64`, or `pollQuestion`/`pollOptions`). `text` doubles as the media caption. Optional `sendAt` schedules the send; omit it to send now.
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
   * Edit a previously-queued message that has not dispatched yet. Accepts a subset of `text`, `mediaUrl`, `mediaCaption`, `sendAt` — at least one is required. Returns 400 once the message has advanced past the editable window (status not in `pending`/`sending`).
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
