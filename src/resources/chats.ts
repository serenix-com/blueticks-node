import { z } from "zod";
import { BaseResource } from "../base-resource";
import {
  ChatSchema,
  ChatMessageSchema,
  ChatMediaSchema,
  ParticipantSchema,
  type Chat,
  type ChatMessage,
  type ChatMedia,
  type Participant,
} from "../types/chats";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ChatPageSchema = pageSchema(ChatSchema);
const ParticipantPageSchema = pageSchema(ParticipantSchema);
const ChatMessagePageSchema = pageSchema(ChatMessageSchema);
const OkSchema = z.object({ ok: z.boolean() }).passthrough();
const GenericSchema = z.record(z.any());

export interface ListChatsParams extends ListParams {
  query?: string;
}
export interface ListMessagesParams extends ListParams {
  mode?: "latest" | "history";
  query?: string;
  since?: string;
  until?: string;
}

export class ChatsResource extends BaseResource {
  /** List/search chats, newest first. Cursor-paginated. */
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

  /** Retrieve a chat by its WhatsApp JID. */
  async get(chatId: string, opts: { signal?: AbortSignal } = {}): Promise<Chat> {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}`,
      schema: ChatSchema,
      signal: opts.signal,
    });
  }

  /** List participants in a group chat. Cursor-paginated. */
  async listParticipants(
    chatId: string,
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Participant>> {
    const { signal, ...rest } = params;
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/participants`,
      query: buildListQuery(rest),
      schema: ParticipantPageSchema,
      signal,
    });
  }

  /** Mark a chat as read. */
  async markRead(chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/mark_read`,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Open a chat on the engine. */
  async open(chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/open`,
      schema: GenericSchema,
      signal: opts.signal,
    });
  }

  /** List messages in a chat (mode=latest by default). Cursor-paginated. */
  async listMessages(
    chatId: string,
    params: ListMessagesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ChatMessage>> {
    const { signal, mode, query, since, until, ...rest } = params;
    const q = buildListQuery(rest);
    q.mode = mode ?? "latest";
    if (query !== undefined) q.query = query;
    if (since !== undefined) q.since = since;
    if (until !== undefined) q.until = until;
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages`,
      query: q,
      schema: ChatMessagePageSchema,
      signal,
    });
  }

  /** Retrieve a single message by WhatsApp message key. */
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

  /** ACK state for a single message. */
  async getMessageAck(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ) {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/ack`,
      schema: GenericSchema,
      signal: opts.signal,
    });
  }

  /** Add or clear an emoji reaction on a message. */
  async react(
    chatId: string,
    key: string,
    body: { emoji: string },
    opts: { signal?: AbortSignal } = {},
  ) {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/reactions`,
      body,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Pull older messages from the phone into the engine's local store. */
  async loadOlderMessages(chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/load_older`,
      schema: GenericSchema,
      signal: opts.signal,
    });
  }

  /** Download message media (may be returned as base64). */
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

  /** Get a short-lived URL for message media. */
  async getMediaUrl(
    chatId: string,
    key: string,
    opts: { signal?: AbortSignal } = {},
  ) {
    return this.client.request({
      method: "GET",
      path: `/v1/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(key)}/media_url`,
      schema: GenericSchema,
      signal: opts.signal,
    });
  }

  /** Batch-fetch ACK data for up to 200 message keys at once. */
  async batchMessageAcks(
    body: { message_keys: string[] },
    opts: { signal?: AbortSignal } = {},
  ) {
    return this.client.request({
      method: "POST",
      path: "/v1/chats/message_acks",
      body,
      schema: GenericSchema,
      signal: opts.signal,
    });
  }
}
