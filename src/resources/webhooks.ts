import { z } from "zod";
import { BaseResource } from "../base-resource";
import {
  WebhookSchema,
  WebhookCreateResultSchema,
  type Webhook,
  type WebhookCreateResult,
} from "../types/webhooks";

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

const VoidSchema = z.undefined();
const WebhookListSchema = z.array(WebhookSchema);

export class WebhooksResource extends BaseResource {
  /** Register a new webhook endpoint. The returned object includes the signing `secret`. */
  async create(body: CreateWebhookParams, opts: { signal?: AbortSignal } = {}): Promise<WebhookCreateResult> {
    return this.client.request({
      method: "POST",
      path: "/v1/webhooks",
      schema: WebhookCreateResultSchema,
      body,
      signal: opts.signal,
    });
  }

  /** List all registered webhooks. */
  async list(opts: { signal?: AbortSignal } = {}): Promise<Webhook[]> {
    return this.client.request({
      method: "GET",
      path: "/v1/webhooks",
      schema: WebhookListSchema,
      signal: opts.signal,
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

  /** Delete a webhook by id. */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<void> {
    await this.client.request({
      method: "DELETE",
      path: `/v1/webhooks/${id}`,
      schema: VoidSchema,
      signal: opts.signal,
    });
  }

  /** Rotate the signing secret for a webhook. The old secret stops verifying immediately. */
  async rotateSecret(id: string, opts: { signal?: AbortSignal } = {}): Promise<WebhookCreateResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/webhooks/${id}/rotate-secret`,
      schema: WebhookCreateResultSchema,
      signal: opts.signal,
    });
  }
}
