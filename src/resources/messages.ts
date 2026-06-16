import { BaseResource } from "../base-resource";
import {
  ChatMessageSchema,
  ChatMediaSchema,
  OkResponseSchema,
  MessageAckSchema,
  LoadOlderMessagesResponseSchema,
  MediaUrlResponseSchema,
  BatchMessageAcksResponseSchema,
  PinnedMessageSchema,
  type ChatMessage,
  type ChatMedia,
  type OkResponse,
  type MessageAck,
  type LoadOlderMessagesResponse,
  type MediaUrlResponse,
  type BatchMessageAcksResponse,
  type PinnedMessage,
  type MessageType,
  type SendInChatRequest,
} from "../types/chats";
import {
  ScheduledMessageSchema,
  type ScheduledMessage,
} from "../types/scheduled-messages";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ChatMessagePageSchema = pageSchema(ChatMessageSchema);
const PinnedMessagePageSchema = pageSchema(PinnedMessageSchema);

export interface ListMessagesParams extends ListParams {
  order?: "asc" | "desc";
  query?: string;
  since?: string;
  until?: string;
  messageTypes?: MessageType[];
  /**
   * Optional WhatsApp JID to scope results to a single chat. Omit to search
   * across all chats.
   */
  chatId?: string;
}

export class MessagesResource extends BaseResource {
  /**
   * List messages (all chats).
   *
   * Offset-paginated list of messages across the whole account. Pass `chatId` to scope to a single chat, or omit it to search across all chats. Supports free-text search (`searchToken`), date range (`since`/`until`), and message-kind filtering (`messageTypes`). Requires `chats:read`.
   */
  async list(
    params: ListMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ChatMessage>> {
    const { signal, order, query, since, until, messageTypes, chatId, ...rest } = params;
    const q = buildListQuery(rest);
    if (order !== undefined) q.order = order;
    if (query !== undefined) q.query = query;
    if (since !== undefined) q.since = since;
    if (until !== undefined) q.until = until;
    if (messageTypes !== undefined && messageTypes.length > 0) {
      // Server accepts comma-separated form for OpenAPI `style: form, explode: false`.
      q.messageTypes = messageTypes.join(",");
    }
    if (chatId !== undefined) q.chatId = chatId;
    return this.client.request({
      method: "GET",
      path: "/v1/messages",
      query: q,
      schema: ChatMessagePageSchema,
      signal,
    });
  }

  /**
   * Send message.
   *
   * Send a message immediately to a specific chat. The body is the same FLAT shape as `POST /v1/scheduled-messages` minus `to` (derived from the URL path) and `sendAt` (this endpoint is fire-and-forget). Set `type` to `text`, `media`, or `poll`. The dispatch is direct — no DB row is created; the response carries the WhatsApp wire key under `key`. For scheduled or queue-managed sends use `POST /v1/scheduled-messages` instead. Requires `messages:write`.
   */
  async send(
    chatId: string,
    body: SendInChatRequest,
    opts: { idempotencyKey?: string; signal?: AbortSignal } = {},
  ): Promise<ScheduledMessage> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/${encodeURIComponent(chatId)}`,
      body,
      schema: ScheduledMessageSchema,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Get message.
   *
   * Fetch a single message by its WhatsApp message key. Requires `chats:read`.
   */
  async get(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<ChatMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: ChatMessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get message delivery status.
   *
   * Returns the WhatsApp ack value for a sent message: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played. Requires `chats:read`.
   */
  async getAck(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<MessageAck> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/ack/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: MessageAckSchema,
      signal: opts.signal,
    });
  }

  /**
   * React to message.
   *
   * Add or replace your reaction to a message. Pass an empty `emoji` string to remove. Requires `chats:write`.
   */
  async react(
    waMessageKey: string,
    body: { emoji: string },
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/reactions/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      body,
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Pin message.
   *
   * Pin a message to the top of its chat. Optionally pass a `duration` (seconds)
   * to control when the pin expires — defaults to 7 days. Requires `chats:write`.
   */
  async pin(
    waMessageKey: string,
    opts: { duration?: number; chatId?: string; signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/pin/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      body: opts.duration !== undefined ? { duration: opts.duration } : {},
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Unpin message.
   *
   * Remove an existing pin from a message. Requires `chats:write`.
   */
  async unpin(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/unpin/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Load older messages.
   *
   * Asks the engine to pull older history from the connected phone for chats that haven`t been fully synced yet. Use this once before paginating with `since` if you need messages older than what`s already cached. Requires `chats:read`.
   */
  async loadOlder(
    chatId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<LoadOlderMessagesResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/load_older/${encodeURIComponent(chatId)}`,
      schema: LoadOlderMessagesResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get message media.
   *
   * Download the media attached to a WhatsApp message (image, video, document, audio).
   * Returns either a hosted URL (`url`) or inline `dataBase64`, plus mimetype + filename.
   *
   * CAVEAT: for own-sent newsletter media, the bytes returned may be a WA-generated
   * preview JPEG (~7KB) rather than the original — `originalQuality` is `false` when
   * this fallback is in effect. Requires `chats:read`.
   */
  async getMedia(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<ChatMedia> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/media/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: ChatMediaSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get message media URL.
   *
   * Returns a hosted URL for the message media without inlining bytes. Faster + cheaper than `media` when the caller can fetch the URL themselves. Same `mediaUnavailable` semantics. Requires `chats:read`.
   */
  async getMediaUrl(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<MediaUrlResponse> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/media_url/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: MediaUrlResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Batch get message acks.
   *
   * Get delivery status for up to 200 sent messages in one call. Useful for campaign dashboards / status reconciliation. Requires `chats:read`.
   */
  async batchAcks(
    body: { messageKeys: string[]; chatId?: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<BatchMessageAcksResponse> {
    return this.client.request({
      method: "POST",
      path: "/v1/messages/acks",
      body,
      schema: BatchMessageAcksResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * List pinned messages.
   *
   * List the currently pinned messages in a chat. Requires `chats:read`.
   */
  async listPinned(
    chatId: string,
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<PinnedMessage>> {
    const { signal, ...rest } = params;
    return this.client.request({
      method: "GET",
      path: `/v1/messages/pinned/${encodeURIComponent(chatId)}`,
      query: buildListQuery(rest),
      schema: PinnedMessagePageSchema,
      signal,
    });
  }
}
