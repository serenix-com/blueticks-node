import { BaseResource } from "../base-resource";
import { WebhookSchema, type Webhook } from "../types/webhooks";
import { DeletedResourceSchema, type DeletedResource } from "../types/deleted";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

export interface CreateWebhookParams {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  description?: string;
  status?: "enabled" | "disabled";
}

const WebhookPageSchema = pageSchema(WebhookSchema);

export class WebhooksResource extends BaseResource {
  /** Register a new webhook endpoint. */
  async create(body: CreateWebhookParams, opts: { signal?: AbortSignal } = {}): Promise<Webhook> {
    return this.client.request({
      method: "POST",
      path: "/v1/webhooks",
      schema: WebhookSchema,
      body,
      signal: opts.signal,
    });
  }

  /**
   * List webhooks, newest first. Cursor-paginated.
   *
   * @example
   *   const page = await bt.webhooks.list({ limit: 100 });
   *   for (const wh of page.data) { ... }
   *   if (page.has_more) {
   *     const next = await bt.webhooks.list({ cursor: page.next_cursor });
   *   }
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Webhook>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/webhooks",
      query: buildListQuery(listParams),
      schema: WebhookPageSchema,
      signal,
    });
  }

  /** Retrieve a webhook by id. */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Webhook> {
    return this.client.request({
      method: "GET",
      path: `/v1/webhooks/${id}`,
      schema: WebhookSchema,
      signal: opts.signal,
    });
  }

  /** Update a webhook (URL, events, description, status). */
  async update(
    id: string,
    body: UpdateWebhookParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Webhook> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/webhooks/${id}`,
      schema: WebhookSchema,
      body,
      signal: opts.signal,
    });
  }

  /** Delete a webhook by id. Returns `{ id, deleted: true }` on success. */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<DeletedResource> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/webhooks/${id}`,
      schema: DeletedResourceSchema,
      signal: opts.signal,
    });
  }
}
