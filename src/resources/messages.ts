import { BaseResource } from "../base-resource";
import {
  PublicMessageSchema,
  MessageAckSchema,
  BatchMessageAckEntrySchema,
  MediaSchema,
  LoadOlderResultSchema,
  PinnedMessageSchema,
  OkResultSchema,
  type PublicMessage,
  type MessageAck,
  type BatchMessageAckEntry,
  type Media,
  type LoadOlderResult,
  type PinnedMessage,
  type OkResult,
  type MessageType,
} from "../types/messages";
import {
  MessageResponseSchema,
  type MessageResponse,
  type MediaKind,
} from "../types/scheduled-messages";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListMessagesParams extends ListParams {
  chatId?: string;
  searchToken?: string;
  order?: "asc" | "desc";
  since?: string;
  until?: string;
  messageTypes?: MessageType[];
  loadFromPhoneIfNeeded?: boolean;
  includeMediaContent?: boolean;
}

/** Flat body accepted by `POST /v1/messages/{chatId}` (direct, fire-and-forget send). */
export interface DirectSendMessageBody {
  type: "text" | "media" | "poll";
  text?: string;
  replyTo?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaKind?: MediaKind;
  mediaFilename?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  pollAllowMultiple?: boolean;
  secret?: string;
  withTyping?: boolean;
  typingSeconds?: number;
}

const PublicMessagePageSchema = pageSchema(PublicMessageSchema);
const BatchMessageAckPageSchema = pageSchema(BatchMessageAckEntrySchema);
const PinnedMessagePageSchema = pageSchema(PinnedMessageSchema);
const MessageResponseEnvelope = dataEnvelope(MessageResponseSchema);
const PublicMessageEnvelope = dataEnvelope(PublicMessageSchema);
const MessageAckEnvelope = dataEnvelope(MessageAckSchema);
const MediaEnvelope = dataEnvelope(MediaSchema);
const LoadOlderResultEnvelope = dataEnvelope(LoadOlderResultSchema);
const OkResultEnvelope = dataEnvelope(OkResultSchema);

export class MessagesResource extends BaseResource {
  /**
   * List messages (all chats).
   *
   * Offset-paginated list of messages across the whole account. Pass `chatId` to scope to a single chat, or omit it to search across all chats. Supports free-text search (`searchToken`), date range (`since`/`until`), and message-kind filtering (`messageTypes`). Requires `chats:read`.
   */
  async list(
    params: ListMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<PublicMessage>> {
    const {
      signal,
      chatId,
      searchToken,
      order,
      since,
      until,
      messageTypes,
      loadFromPhoneIfNeeded,
      includeMediaContent,
      ...listParams
    } = params;
    const query = buildListQuery(listParams);
    if (chatId !== undefined) query.chatId = chatId;
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (order !== undefined) query.order = order;
    if (since !== undefined) query.since = since;
    if (until !== undefined) query.until = until;
    if (messageTypes !== undefined && messageTypes.length > 0) {
      // Server accepts the comma-separated form for `style: form, explode: false`.
      query.messageTypes = messageTypes.join(",");
    }
    if (loadFromPhoneIfNeeded !== undefined) query.loadFromPhoneIfNeeded = loadFromPhoneIfNeeded;
    if (includeMediaContent !== undefined) query.includeMediaContent = includeMediaContent;
    return this.client.request({
      method: "GET",
      path: "/v1/messages",
      query,
      schema: PublicMessagePageSchema,
      signal,
    });
  }

  /**
   * Send message.
   *
   * Send a message immediately to a specific chat. The body is the same FLAT shape as `POST /v1/scheduled-messages` minus `to` (derived from the URL path) and `sendAt` (this endpoint is fire-and-forget). Set `type` to `text`, `media`, or `poll`. The dispatch is direct — no DB row is created; the response carries the WhatsApp wire key. For scheduled or queue-managed sends use `POST /v1/scheduled-messages` instead. Requires `messages:write`.
   */
  async send(
    chatId: string,
    body: DirectSendMessageBody,
    opts: { idempotencyKey?: string; signal?: AbortSignal } = {},
  ): Promise<MessageResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/${encodeURIComponent(chatId)}`,
      body,
      schema: MessageResponseEnvelope,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Get message.
   *
   * Fetch a single message by its complete WhatsApp message key. Requires `chats:read`.
   */
  async get(
    waMessageKey: string,
    opts: { chatId?: string; signal?: AbortSignal } = {},
  ): Promise<PublicMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: PublicMessageEnvelope,
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
      schema: MessageAckEnvelope,
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
  ): Promise<Page<BatchMessageAckEntry>> {
    return this.client.request({
      method: "POST",
      path: "/v1/messages/acks",
      body,
      schema: BatchMessageAckPageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Load older messages.
   *
   * Asks the engine to pull older history from the connected phone for chats that haven't been fully synced yet. Use this once before paginating with `since` if you need messages older than what's already cached. Requires `chats:read`.
   */
  async loadOlder(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<LoadOlderResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/load_older/${encodeURIComponent(chatId)}`,
      schema: LoadOlderResultEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Get message media.
   *
   * Download the media attached to a WhatsApp message (image, video, document, audio). Returns either a hosted URL (`url`) or inline `dataBase64`, plus mimetype + filename. Pass `maxAttempts: 1` to skip the poll and return immediately. Requires `chats:read`.
   */
  async getMedia(
    waMessageKey: string,
    opts: { chatId?: string; maxAttempts?: number; signal?: AbortSignal } = {},
  ): Promise<Media> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (opts.chatId !== undefined) query.chatId = opts.chatId;
    if (opts.maxAttempts !== undefined) query.maxAttempts = opts.maxAttempts;
    return this.client.request({
      method: "GET",
      path: `/v1/messages/media/${encodeURIComponent(waMessageKey)}`,
      query,
      schema: MediaEnvelope,
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
    opts: { signal?: AbortSignal } = {},
  ): Promise<Page<PinnedMessage>> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/pinned/${encodeURIComponent(chatId)}`,
      schema: PinnedMessagePageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Pin message.
   *
   * Pin a message to the top of its chat. Optionally pass a `duration` (seconds) in the body to control when the pin expires — defaults to 7 days. Requires `chats:write`.
   */
  async pin(
    waMessageKey: string,
    opts: { duration?: number; chatId?: string; signal?: AbortSignal } = {},
  ): Promise<OkResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/pin/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      body: opts.duration !== undefined ? { duration: opts.duration } : undefined,
      schema: OkResultEnvelope,
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
  ): Promise<OkResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/unpin/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      schema: OkResultEnvelope,
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
  ): Promise<OkResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/messages/reactions/${encodeURIComponent(waMessageKey)}`,
      query: opts.chatId !== undefined ? { chatId: opts.chatId } : undefined,
      body,
      schema: OkResultEnvelope,
      signal: opts.signal,
    });
  }
}
