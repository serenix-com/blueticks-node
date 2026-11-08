import { z } from "zod";
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
  MessagesListCoverageSchema,
  MessageSourcesSchema,
  type MessagesListCoverage,
  type MessageSources,
  type PinnedMessage,
  type OkResult,
  type MessageType,
} from "../types/messages";
import {
  MessageResponseSchema,
  type MessageResponse,
  type MediaKind,
  type ButtonReplyParams,
} from "../types/scheduled-messages";
import {
  arrayOrPageSchema,
  dataEnvelope,
  buildListQuery,
  addEngineTargetQuery,
  AnsweredBySchema,
  type EngineSelectorParams,
  type EngineTargetParams,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListMessagesParams extends ListParams, EngineTargetParams {
  chatId?: string;
  searchToken?: string;
  order?: "asc" | "desc";
  since?: string;
  until?: string;
  messageTypes?: MessageType[];
  loadFromPhoneIfNeeded?: boolean;
  includeMediaContent?: boolean;
  /** Keyword-set OR search: match if body/caption/filename contains ANY term. */
  queryAny?: string[];
  /** MIME prefix filter, e.g. `"application/pdf"` or `"image/"`. */
  mime?: string;
  /** Case-insensitive substring match on the document filename. */
  filenameContains?: string;
  /** true = only messages with a media attachment; false = only non-media. */
  hasMedia?: boolean;
  /** Case-insensitive substring match on the sender JID/phone. */
  sender?: string;
}

/** A page of messages. `coverage` reports how far back the chat is loaded, when the server includes it. */
export interface MessagesPage extends Page<PublicMessage> {
  coverage?: MessagesListCoverage;
  /** True when more pages exist beyond this one. */
  hasMore?: boolean;
  /** True when the requested `since` bound was reached while loading. */
  sinceReached?: boolean;
  /** How many older pages were loaded automatically to satisfy the query. */
  autoLoadedPages?: number;
  /** Count of results per source (e.g. `{ backup: 1 }`). */
  sources?: MessageSources;
}

/** Options for `messages.loadOlder`. */
export interface LoadOlderOptions {
  /** How many older pages to pull in one call (1-10, default 1). */
  pages?: number;
  /** Stop once the oldest loaded message is at/before this date (ISO 8601 string or epoch seconds/ms). */
  until_date?: string | number;
  signal?: AbortSignal;
}

/** Flat body accepted by `POST /v1/messages/{chatId}` (direct, fire-and-forget send). */
export interface DirectSendMessageBody extends EngineSelectorParams {
  /** Optional: omit it when sending a `buttonReply` or a media message identified by `mediaFileId`. */
  type?: "text" | "media" | "poll";
  /** Answer a menu/button message. `replyTo` is the quoted message id; `buttonId` the chosen option. */
  buttonReply?: ButtonReplyParams;
  /** Id returned by `POST /v1/uploads`; send a file uploaded there. Pair with `mediaMimeType`. */
  mediaFileId?: string;
  mediaMimeType?: string;
  /** Sender number (E.164) to send from, when the account has several numbers. */
  from?: string;
  /** Native WhatsApp Business label ids to apply to the chat (at most 20). */
  waLabelIds?: string[];
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
  /** Participant JIDs to @mention in a group (e.g. `["12025550101@c.us"]`). */
  mentions?: string[];
}

const PublicMessagePageSchema = z
  .object({
    success: z.literal(true),
    data: z.array(PublicMessageSchema),
    limit: z.number().int(),
    skip: z.number().int(),
    total: z.number().int(),
    coverage: MessagesListCoverageSchema.nullish(),
    answeredBy: AnsweredBySchema.nullish(),
    nextCursor: z.string().nullish(),
    hasMore: z.boolean().nullish(),
    sinceReached: z.boolean().nullish(),
    autoLoadedPages: z.number().int().nullish(),
    sources: MessageSourcesSchema.nullish(),
  })
  .transform((r): MessagesPage => {
    const page: MessagesPage = { data: r.data, limit: r.limit, skip: r.skip, total: r.total };
    if (r.coverage) page.coverage = r.coverage;
    if (r.answeredBy) page.answeredBy = r.answeredBy;
    if (r.nextCursor !== undefined && r.nextCursor !== null) page.nextCursor = r.nextCursor;
    if (r.hasMore !== undefined && r.hasMore !== null) page.hasMore = r.hasMore;
    if (r.sinceReached !== undefined && r.sinceReached !== null) page.sinceReached = r.sinceReached;
    if (r.autoLoadedPages !== undefined && r.autoLoadedPages !== null) page.autoLoadedPages = r.autoLoadedPages;
    if (r.sources) page.sources = r.sources;
    return page;
  });
const BatchMessageAckPageSchema = arrayOrPageSchema(BatchMessageAckEntrySchema);
const PinnedMessagePageSchema = arrayOrPageSchema(PinnedMessageSchema);
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
  ): Promise<MessagesPage> {
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
      queryAny,
      mime,
      filenameContains,
      hasMedia,
      sender,
      ...listParams
    } = params;
    const query = addEngineTargetQuery(buildListQuery(listParams), listParams);
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
    if (queryAny !== undefined && queryAny.length > 0) {
      // Server accepts the comma-separated form (terms are split on commas).
      query.queryAny = queryAny.join(",");
    }
    if (mime !== undefined) query.mime = mime;
    if (filenameContains !== undefined) query.filenameContains = filenameContains;
    if (hasMedia !== undefined) query.hasMedia = hasMedia;
    if (sender !== undefined) query.sender = sender;
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
   * Asks the engine to pull older history from the connected phone for chats that haven't been fully synced yet. Use this before paginating with `since` if you need messages older than what's already cached. Optionally pull several pages in one call via `pages` (WA-paced ~2.5s apart) and/or stop at a target depth via `until_date`; the response reports how far back the chat is now loaded under `coverage`. Requires `chats:read`.
   */
  async loadOlder(chatId: string, opts: LoadOlderOptions = {}): Promise<LoadOlderResult> {
    const body: { pages?: number; until_date?: string | number } = {};
    if (opts.pages !== undefined) body.pages = opts.pages;
    if (opts.until_date !== undefined) body.until_date = opts.until_date;
    return this.client.request({
      method: "POST",
      path: `/v1/messages/load_older/${encodeURIComponent(chatId)}`,
      body: Object.keys(body).length > 0 ? body : undefined,
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
