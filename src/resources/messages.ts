import { BaseResource } from "../base-resource";
import { MessageSchema, type Message } from "../types/messages";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const MessagePageSchema = pageSchema(MessageSchema);

/** Shared optional fields present on every message variant. */
export interface SendMessageCommon {
  to: string;
  send_at?: string;
  from?: string;
  reply_to?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/** Send a plain-text message. */
export interface SendTextMessageParams extends SendMessageCommon {
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
export interface SendMediaMessageParams extends SendMessageCommon {
  type: "media";
  media: {
    url: string;
    kind?: "image" | "video" | "audio" | "document" | "sticker" | "voice";
    caption?: string;
    filename?: string;
  };
}

/** Send a poll message. */
export interface SendPollMessageParams extends SendMessageCommon {
  type: "poll";
  poll: {
    question: string;
    options: string[];
    allow_multiple?: boolean;
  };
}

export type SendMessageParams =
  | SendTextMessageParams
  | SendMediaMessageParams
  | SendPollMessageParams;

export class MessagesResource extends BaseResource {
  /**
   * Send message.
   *
   * Send a message via WhatsApp. The body is a discriminated union — set the `type` field to one of `text`, `media`, or `poll`.
   */
  async send(params: SendMessageParams): Promise<Message> {
    const { idempotencyKey, signal, ...body } = params;
    return this.client.request({
      method: "POST",
      path: "/v1/messages",
      schema: MessageSchema,
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
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Message> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${id}`,
      schema: MessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * List messages.
   *
   * List messages sent through the API, newest first (cursor-paginated).
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Message>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/messages",
      query: buildListQuery(listParams),
      schema: MessagePageSchema,
      signal,
    });
  }

  /**
   * Update message.
   *
   * Edit a previously-queued message that has not dispatched yet. Accepts a subset of `text`, `media_url`, `media_caption`, `send_at` — at least one is required. Returns 400 once the message has advanced past the editable window (status not in `pending`/`sending`).
   */
  async update(
    id: string,
    body: UpdateMessageParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Message> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/messages/${encodeURIComponent(id)}`,
      body,
      schema: MessageSchema,
      signal: opts.signal,
    });
  }
}

/** Subset of mutable fields accepted by `PATCH /v1/messages/{id}`. */
export interface UpdateMessageParams {
  text?: string;
  media_url?: string;
  media_caption?: string;
  send_at?: string;
}
