import { BaseResource } from "../base-resource";
import {
  ChatSchema,
  ChatMessageSchema,
  ChatMediaSchema,
  ParticipantListSchema,
  OkResponseSchema,
  ChatRefSchema,
  MessageAckSchema,
  LoadOlderMessagesResponseSchema,
  MediaUrlResponseSchema,
  BatchMessageAcksResponseSchema,
  type Chat,
  type ChatMessage,
  type ChatMedia,
  type ParticipantList,
  type OkResponse,
  type ChatRef,
  type MessageAck,
  type LoadOlderMessagesResponse,
  type MediaUrlResponse,
  type BatchMessageAcksResponse,
  type MessageType,
} from "../types/chats";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ChatPageSchema = pageSchema(ChatSchema);
const ChatMessagePageSchema = pageSchema(ChatMessageSchema);

export interface ListChatsParams extends ListParams {
  query?: string;
}
export interface ListMessagesParams extends ListParams {
  mode?: "latest" | "history";
  query?: string;
  since?: string;
  until?: string;
  message_types?: MessageType[];
}

export class ChatsResource extends BaseResource {
  /**
   * List chats.
   *
   * Cursor-paginated list of recent chats, newest first. Use `query` for free-text search across chat names. Requires `chats:read`.
   */
  async list(params: ListChatsParams & { signal?: AbortSignal } = {}): Promise<Page<Chat>> {
    const { signal, query, ...rest } = params;
    const q = buildListQuery(rest);
    if (query !== undefined) q.query = query;
    return this.client.request({
      method: "GET",
      path: "/v1/chats",
      query: q,
      schema: ChatPageSchema,
      signal,
    });
  }

  /**
   * Retrieve chat.
   *
   * Fetch a single chat by its WhatsApp JID (`chat_id`). Requires `chats:read`.
   */
  async get(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<Chat> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}`,
      schema: ChatSchema,
      signal: opts.signal,
    });
  }

  /**
   * List chat participants.
   *
   * For group chats, returns the participant list (paginated). For DMs, returns the single counterparty. Requires `chats:read`.
   */
  async listParticipants(
    chatId: string,
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<ParticipantList> {
    const { signal, ...rest } = params;
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/participants`,
      query: buildListQuery(rest),
      schema: ParticipantListSchema,
      signal,
    });
  }

  /**
   * Mark chat as read.
   *
   * Clears the unread badge on the connected engine for the given chat. Requires `chats:write`.
   */
  async markRead(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/mark_read`,
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Open chat in engine.
   *
   * Brings the chat to the foreground on the connected WhatsApp Web client (creates the chat if it doesn`t exist yet for the engine). Useful before issuing follow-up reads on a fresh JID. Requires `chats:write`.
   */
  async open(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<ChatRef> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/open`,
      schema: ChatRefSchema,
      signal: opts.signal,
    });
  }

  /**
   * List chat messages.
   *
   * Cursor-paginated list of messages in a chat. Supports free-text search (`query`), date range (`since`/`until`), and message-kind filtering (`message_types`). Requires `chats:read`.
   */
  async listMessages(
    chatId: string,
    params: ListMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ChatMessage>> {
    const { signal, mode, query, since, until, message_types, ...rest } = params;
    const q = buildListQuery(rest);
    q.mode = mode ?? "latest";
    if (query !== undefined) q.query = query;
    if (since !== undefined) q.since = since;
    if (until !== undefined) q.until = until;
    if (message_types !== undefined && message_types.length > 0) {
      // Server accepts comma-separated form for OpenAPI `style: form, explode: false`.
      q.message_types = message_types.join(",");
    }
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages`,
      query: q,
      schema: ChatMessagePageSchema,
      signal,
    });
  }

  /**
   * Get chat message.
   *
   * Fetch a single message by its WhatsApp message key. Requires `chats:read`.
   */
  async getMessage(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ChatMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}`,
      schema: ChatMessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get message delivery status.
   *
   * Returns the WhatsApp ack value for a sent message: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played. Requires `chats:read`.
   */
  async getMessageAck(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<MessageAck> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/ack`,
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
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/reactions`,
      body,
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Load older messages from phone.
   *
   * Asks the engine to pull older history from the connected phone for chats that haven`t been fully synced yet. Use this once before paginating with `since` if you need messages older than what`s already cached. Requires `chats:read`.
   */
  async loadOlderMessages(
    chatId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<LoadOlderMessagesResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/load_older`,
      schema: LoadOlderMessagesResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get chat-message media.
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
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/media`,
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
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/media_url`,
      schema: MediaUrlResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Batch get message acks.
   *
   * Get delivery status for up to 200 sent messages in one call. Useful for campaign dashboards / status reconciliation. Requires `chats:read`.
   */
  async batchMessageAcks(
    body: { message_keys: string[] },
    opts: { signal?: AbortSignal } = {},
  ): Promise<BatchMessageAcksResponse> {
    return this.client.request({
      method: "POST",
      path: "/v1/chats/message_acks",
      body,
      schema: BatchMessageAcksResponseSchema,
      signal: opts.signal,
    });
  }
}
