import { BaseResource } from "../base-resource";
import { WebhookSchema, type Webhook } from "../types/webhooks";
import { DeletedResourceSchema, type DeletedResource } from "../types/deleted";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface CreateWebhookParams {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  description?: string | null;
  status?: "enabled" | "disabled";
}

export interface ListWebhooksParams extends ListParams {
  order?: "asc" | "desc";
}

const WebhookPageSchema = pageSchema(WebhookSchema);
const WebhookEnvelope = dataEnvelope(WebhookSchema);
const DeletedResourceEnvelope = dataEnvelope(DeletedResourceSchema);

export class WebhooksResource extends BaseResource {
  /**
   * List webhooks.
   *
   * List webhooks in the workspace.
   */
  async list(
    params: ListWebhooksParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Webhook>> {
    const { signal, order, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (order !== undefined) query.order = order;
    return this.client.request({
      method: "GET",
      path: "/v1/webhooks",
      query,
      schema: WebhookPageSchema,
      signal,
    });
  }

  /**
   * Create webhook.
   *
   * Register a new webhook.
   */
  async create(body: CreateWebhookParams, opts: { signal?: AbortSignal } = {}): Promise<Webhook> {
    return this.client.request({
      method: "POST",
      path: "/v1/webhooks",
      schema: WebhookEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Get webhook.
   *
   * Get a webhook by id.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Webhook> {
    return this.client.request({
      method: "GET",
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
      schema: WebhookEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Update webhook.
   *
   * Update a webhook.
   */
  async update(
    id: string,
    body: UpdateWebhookParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Webhook> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
      schema: WebhookEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Delete webhook.
   *
   * Delete a webhook.
   */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<DeletedResource> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
      schema: DeletedResourceEnvelope,
      signal: opts.signal,
    });
  }
}
