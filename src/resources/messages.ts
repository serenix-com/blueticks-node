import { BaseResource } from "../base-resource";
import { ChatMessageSchema, type ChatMessage, type MessageType } from "../types/chats";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ChatMessagePageSchema = pageSchema(ChatMessageSchema);

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
}
