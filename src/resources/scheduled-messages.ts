import { BaseResource } from "../base-resource";
import {
  MessageResponseSchema,
  type MessageResponse,
  type MediaKind,
  type MessageStatus,
} from "../types/scheduled-messages";
import { DeletedResourceSchema, type DeletedResource } from "../types/deleted";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

/** Flat body accepted by `POST /v1/scheduled-messages/{chatId}`. `type` selects which fields apply. */
export interface SendMessageBody {
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
  sendAt?: string;
}

/** Body accepted by `PATCH /v1/scheduled-messages/{id}` — same flat fields as send, all optional. */
export interface UpdateScheduledMessageBody {
  type?: "text" | "media" | "poll";
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
  sendAt?: string;
}

/** Optional filters accepted by `GET /v1/scheduled-messages`. */
export interface ListScheduledMessagesParams extends ListParams {
  chatId?: string;
  searchToken?: string;
  status?: MessageStatus;
  order?: "asc" | "desc";
}

const MessageResponsePageSchema = pageSchema(MessageResponseSchema);
const MessageResponseEnvelope = dataEnvelope(MessageResponseSchema);
const DeletedResourceEnvelope = dataEnvelope(DeletedResourceSchema);

export class ScheduledMessagesResource extends BaseResource {
  /**
   * List scheduled messages.
   *
   * List messages in the user-messages queue (all sources: API, dashboard, extension), newest first (offset-paginated). Optionally filter by `chatId` and/or lifecycle `status`.
   */
  async list(
    params: ListScheduledMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<MessageResponse>> {
    const { signal, chatId, searchToken, status, order, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (chatId !== undefined) query.chatId = chatId;
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (status !== undefined) query.status = status;
    if (order !== undefined) query.order = order;
    return this.client.request({
      method: "GET",
      path: "/v1/scheduled-messages",
      query,
      schema: MessageResponsePageSchema,
      signal,
    });
  }

  /**
   * Schedule message.
   *
   * Send or schedule a WhatsApp message to the chat named in the URL path (`chatId` — a phone number in E.164 format, e.g. `+15551234567`, or a WhatsApp chat id like `12345@c.us` / `1234567890@g.us` / `12345@newsletter`). Omit `sendAt` to send immediately; set it (RFC 3339, ≥10s and ≤365d in the future) to defer delivery. The body is a FLAT object — set the `type` field to one of `text`, `media`, or `poll`. Pass an `idempotencyKey` to make retries safe (at most one send per key). Requires `messages:write`.
   */
  async create(
    chatId: string,
    body: SendMessageBody,
    opts: { idempotencyKey?: string; signal?: AbortSignal } = {},
  ): Promise<MessageResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/scheduled-messages/${encodeURIComponent(chatId)}`,
      body,
      schema: MessageResponseEnvelope,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Get scheduled message.
   *
   * Get the current status of a message by ID.
   */
  async retrieve(id: string, opts: { signal?: AbortSignal } = {}): Promise<MessageResponse> {
    return this.client.request({
      method: "GET",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      schema: MessageResponseEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Update scheduled message.
   *
   * Edit a previously-queued message that has not dispatched yet (status `pending`). Accepts the same flat body fields as Schedule message, but every field is optional; send only the fields you want to change (at least one is required). The recipient is fixed at schedule time and cannot be changed here. Returns 400 once the message has advanced past the editable window.
   */
  async update(
    id: string,
    body: UpdateScheduledMessageBody,
    opts: { signal?: AbortSignal } = {},
  ): Promise<MessageResponse> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      body,
      schema: MessageResponseEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Delete scheduled message.
   *
   * Delete a scheduled or queued message so it will not be sent. Soft-deletes the message (and records a cancellation in its delivery log). Returns 404 if no pending/queued message with this id is owned by the caller.
   */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<DeletedResource> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      schema: DeletedResourceEnvelope,
      signal: opts.signal,
    });
  }
}
