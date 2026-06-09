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
  mode?: "latest" | "history";
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

export interface ListChatMessagesParams extends ListParams {
  mode?: "latest" | "history";
  query?: string;
  since?: string;
  until?: string;
  messageTypes?: MessageType[];
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
    const { signal, mode, query, since, until, messageTypes, chatId, ...rest } = params;
    const q = buildListQuery(rest);
    q.mode = mode ?? "latest";
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
   * List messages.
   *
   * Offset-paginated list of messages in a chat. Supports free-text search (`searchToken`), date range (`since`/`until`), and message-kind filtering (`messageTypes`). Requires `chats:read`.
   */
  async listForChat(
    chatId: string,
    params: ListChatMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ChatMessage>> {
    const { signal, mode, query, since, until, messageTypes, ...rest } = params;
    const q = buildListQuery(rest);
    q.mode = mode ?? "latest";
    if (query !== undefined) q.query = query;
    if (since !== undefined) q.since = since;
    if (until !== undefined) q.until = until;
    if (messageTypes !== undefined && messageTypes.length > 0) {
      // Server accepts comma-separated form for OpenAPI `style: form, explode: false`.
      q.messageTypes = messageTypes.join(",");
    }
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(chatId)}`,
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
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ChatMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(key)}`,
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
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<MessageAck> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/ack/${encodeURIComponent(chatId)}/${encodeURIComponent(key)}`,
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
    chatId: string,
    key: string,
    body: { emoji: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/reactions/${encodeURIComponent(chatId)}/${encodeURIComponent(key)}`,
      body,
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
   * Returns either a hosted URL (`url`) or inline `data_base64`, plus mimetype + filename.
   *
   * CAVEAT: for own-sent newsletter media, the bytes returned may be a WA-generated
   * preview JPEG (~7KB) rather than the original — `original_quality` is `false` when
   * this fallback is in effect. Requires `chats:read`.
   */
  async getMedia(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ChatMedia> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/media/${encodeURIComponent(chatId)}/${encodeURIComponent(key)}`,
      schema: ChatMediaSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get message media URL.
   *
   * Returns a hosted URL for the message media without inlining bytes. Faster + cheaper than `media` when the caller can fetch the URL themselves. Same `media_unavailable` semantics. Requires `chats:read`.
   */
  async getMediaUrl(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<MediaUrlResponse> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/media_url/${encodeURIComponent(chatId)}/${encodeURIComponent(key)}`,
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
    body: { message_keys: string[]; chat_id?: string },
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
