import { BaseResource } from "../base-resource";
import { z } from "zod";
import {
  ChatSchema,
  ParticipantSchema,
  ChatMutationResultSchema,
  type Chat,
  type ChatType,
  type Participant,
  type ChatMutationResult,
} from "../types/chats";
import { WaLabelSchema, type WaLabel } from "../types/wa-labels";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  addEngineTargetQuery,
  type EngineTargetParams,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListChatsParams extends ListParams, EngineTargetParams {
  searchToken?: string;
  filter?: "groups" | "contacts" | "newsletters";
  includeLastMessage?: boolean;
  /** @deprecated No longer documented in the API spec; still forwarded for compatibility. */
  includeExtendedInfo?: boolean;
  includeWithoutName?: boolean;
  includeArchive?: boolean;
  /** Keep only these chat kinds. */
  kinds?: ChatType[];
  /** Keep only chats whose last message is at/after this ISO 8601 instant (approximate). */
  since?: string;
}

export interface ListParticipantsParams extends ListParams, EngineTargetParams {
  searchToken?: string;
}

/** Body accepted by `PATCH /v1/chats/{chatId}/wa-labels`: the full replacement label set. */
export interface SetChatWaLabelsParams {
  /** Native WhatsApp Business label ids (from `wa-labels.list`). At most 20; empty clears all. */
  labelIds: string[];
}

const ChatPageSchema = pageSchema(ChatSchema);
const ParticipantPageSchema = pageSchema(ParticipantSchema);
const ChatEnvelope = dataEnvelope(ChatSchema);
const ChatMutationEnvelope = dataEnvelope(ChatMutationResultSchema);
const WaLabelListEnvelope = dataEnvelope(z.array(WaLabelSchema));

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
      kinds,
      since,
      engine,
      engineId,
      numberId,
      phone,
      fanoutLimit,
      ...listParams
    } = params;
    const query = addEngineTargetQuery(buildListQuery(listParams), {
      engine,
      engineId,
      numberId,
      phone,
      fanoutLimit,
    });
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (filter !== undefined) query.filter = filter;
    if (includeLastMessage !== undefined) query.includeLastMessage = includeLastMessage;
    if (includeExtendedInfo !== undefined) query.includeExtendedInfo = includeExtendedInfo;
    if (includeWithoutName !== undefined) query.includeWithoutName = includeWithoutName;
    if (includeArchive !== undefined) query.includeArchive = includeArchive;
    if (kinds !== undefined && kinds.length > 0) query.kinds = kinds.join(",");
    if (since !== undefined) query.since = since;
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
    const { signal, searchToken, engine, engineId, numberId, phone, fanoutLimit, ...listParams } =
      params;
    const query = addEngineTargetQuery(buildListQuery(listParams), {
      engine,
      engineId,
      numberId,
      phone,
      fanoutLimit,
    });
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

  /**
   * List chat native labels.
   *
   * Return the native WhatsApp Business labels currently assigned to the chat. WhatsApp Business accounts only — a non-Business account returns an empty list. Requires `wa-labels:read`.
   */
  async listWaLabels(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<WaLabel[]> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/wa-labels`,
      schema: WaLabelListEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Set chat native labels.
   *
   * Replace the chat's native WhatsApp Business label set with exactly `labelIds` (values from `wa-labels.list`). An empty array clears all labels. At most 20. Requires a WhatsApp Business account — a non-Business account returns 409 `wa_business_required`. Requires `wa-labels:write`.
   */
  async updateWaLabels(
    chatId: string,
    body: SetChatWaLabelsParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ChatMutationResult> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/chats/${encodeURIComponent(chatId)}/wa-labels`,
      body,
      schema: ChatMutationEnvelope,
      signal: opts.signal,
    });
  }
}
