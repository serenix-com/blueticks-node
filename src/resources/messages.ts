import { BaseResource } from "../base-resource";
import { MessageSchema, type Message } from "../types/messages";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const MessagePageSchema = pageSchema(MessageSchema);

export interface SendMessageParams {
  to: string;
  text?: string;
  media_url?: string;
  media_caption?: string;
  send_at?: string;
  from?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class MessagesResource extends BaseResource {
  /**
   * Send a message immediately or schedule one for later.
   */
  async send(params: SendMessageParams): Promise<Message> {
    const { idempotencyKey, signal, ...body } = params;
    return this.client.request({
      method: "POST",
      path: "/v1/messages",
      schema: MessageSchema,
      body,
      idempotencyKey,
      signal,
    });
  }

  /**
   * Retrieve a previously sent or scheduled message by id.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Message> {
    return this.client.request({
      method: "GET",
      path: `/v1/messages/${id}`,
      schema: MessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * List messages sent through the API, newest first. Cursor-paginated.
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Message>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/messages",
      query: buildListQuery(listParams),
      schema: MessagePageSchema,
      signal,
    });
  }
}
