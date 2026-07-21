import { BaseResource } from "../base-resource";
import {
  ChatSchema,
  ParticipantSchema,
  ChatMutationResultSchema,
  type Chat,
  type Participant,
  type ChatMutationResult,
} from "../types/chats";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListChatsParams extends ListParams {
  searchToken?: string;
  filter?: "groups" | "contacts" | "newsletters";
  includeLastMessage?: boolean;
  includeExtendedInfo?: boolean;
  includeWithoutName?: boolean;
  includeArchive?: boolean;
}

export interface ListParticipantsParams extends ListParams {
  searchToken?: string;
}

const ChatPageSchema = pageSchema(ChatSchema);
const ParticipantPageSchema = pageSchema(ParticipantSchema);
const ChatEnvelope = dataEnvelope(ChatSchema);
const ChatMutationEnvelope = dataEnvelope(ChatMutationResultSchema);

export class ChatsResource extends BaseResource {
  /**
   * List chats.
   *
   * List the chats (conversations) the connected WhatsApp engine sees, most-recent first. Offset-paginated via `limit` + `skip`, with an optional case-insensitive substring search on the chat name via `searchToken` and a `filter` to restrict to one chat kind. Requires `chats:read`.
   */
  async list(params: ListChatsParams & { signal?: AbortSignal } = {}): Promise<Page<Chat>> {
    const {
      signal,
      searchToken,
      filter,
      includeLastMessage,
      includeExtendedInfo,
      includeWithoutName,
      includeArchive,
      ...listParams
    } = params;
    const query = buildListQuery(listParams);
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (filter !== undefined) query.filter = filter;
    if (includeLastMessage !== undefined) query.includeLastMessage = includeLastMessage;
    if (includeExtendedInfo !== undefined) query.includeExtendedInfo = includeExtendedInfo;
    if (includeWithoutName !== undefined) query.includeWithoutName = includeWithoutName;
    if (includeArchive !== undefined) query.includeArchive = includeArchive;
    return this.client.request({
      method: "GET",
      path: "/v1/chats",
      query,
      schema: ChatPageSchema,
      signal,
    });
  }

  /**
   * Get chat.
   *
   * Retrieve a single chat by its id — a phone number in international format (e.g. +14155551234) or a WhatsApp JID (`@c.us`, `@g.us`, or `@newsletter`). Requires `chats:read`.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Chat> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(id)}`,
      schema: ChatEnvelope,
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
    params: ListParticipantsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Participant>> {
    const { signal, searchToken, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (searchToken !== undefined) query.searchToken = searchToken;
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/participants`,
      query,
      schema: ParticipantPageSchema,
      signal,
    });
  }

  /**
   * Mark chat as read.
   *
   * Clears the unread badge on the connected engine for the given chat. Requires `chats:write`.
   */
  async markRead(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<ChatMutationResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/mark_read`,
      schema: ChatMutationEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Archive chat.
   *
   * Archives the given chat on the connected engine, hiding it from the main chat list. Requires `chats:write`.
   */
  async archive(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<ChatMutationResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/archive`,
      schema: ChatMutationEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Unarchive chat.
   *
   * Removes the given chat from the archive, restoring it to the main chat list. Requires `chats:write`.
   */
  async unarchive(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<ChatMutationResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/unarchive`,
      schema: ChatMutationEnvelope,
      signal: opts.signal,
    });
  }
}
