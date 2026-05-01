import { BaseResource } from "../base-resource";
import {
  ScheduledMessageSchema,
  type ScheduledMessage,
} from "../types/scheduled-messages";
import { DeletedResourceSchema, type DeletedResource } from "../types/deleted";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const ScheduledMessagePageSchema = pageSchema(ScheduledMessageSchema);

export interface UpdateScheduledMessageParams {
  text?: string;
  media_url?: string;
  media_caption?: string;
  send_at?: string;
}

export class ScheduledMessagesResource extends BaseResource {
  /**
   * List scheduled messages.
   *
   * Retrieves a list of all resources from the service.
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<ScheduledMessage>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/scheduled-messages",
      query: buildListQuery(listParams),
      schema: ScheduledMessagePageSchema,
      signal,
    });
  }

  /**
   * Get scheduled message.
   *
   * Retrieves a single resource with the given id from the service.
   */
  async retrieve(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ScheduledMessage> {
    return this.client.request({
      method: "GET",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      schema: ScheduledMessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Update scheduled message.
   *
   * Updates the resource identified by id using data.
   */
  async update(
    id: string,
    body: UpdateScheduledMessageParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<ScheduledMessage> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      body,
      schema: ScheduledMessageSchema,
      signal: opts.signal,
    });
  }

  /**
   * Cancel scheduled message.
   *
   * Removes the resource with id. Returns `{ id, deleted: true }` on success.
   */
  async delete(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<DeletedResource> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/scheduled-messages/${encodeURIComponent(id)}`,
      schema: DeletedResourceSchema,
      signal: opts.signal,
    });
  }
}
