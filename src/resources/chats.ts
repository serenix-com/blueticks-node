import { BaseResource } from "../base-resource";
import {
  ChatSchema,
  ParticipantListSchema,
  OkResponseSchema,
  ChatRefSchema,
  type Chat,
  type ParticipantList,
  type OkResponse,
  type ChatRef,
} from "../types/chats";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ChatPageSchema = pageSchema(ChatSchema);

export interface ListChatsParams extends ListParams {
  query?: string;
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
   * Archive chat.
   *
   * Archives the given chat on the connected engine, hiding it from the main chat list. Requires `chats:write`.
   */
  async archive(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/archive`,
      schema: OkResponseSchema,
      signal: opts.signal,
    });
  }

  /**
   * Unarchive chat.
   *
   * Removes the given chat from the archive, restoring it to the main chat list. Requires `chats:write`.
   */
  async unarchive(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<OkResponse> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/unarchive`,
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
}
