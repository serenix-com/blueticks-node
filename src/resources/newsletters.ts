import { BaseResource } from "../base-resource";
import {
  NewsletterSchema,
  NewsletterListItemSchema,
  type Newsletter,
  type NewsletterListItem,
} from "../types/newsletters";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const NewsletterPageSchema = pageSchema(NewsletterListItemSchema);

export interface CreateNewsletterParams {
  name: string;
  description?: string;
}

export class NewslettersResource extends BaseResource {
  /**
   * List newsletters.
   *
   * List newsletters visible to the connected WhatsApp engine. Cursor-paginated via `limit` + `cursor`. Requires `newsletters:read` scope.
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<NewsletterListItem>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/newsletters",
      query: buildListQuery(listParams),
      schema: NewsletterPageSchema,
      signal,
    });
  }

  /**
   * Create newsletter.
   *
   * Create a new WhatsApp newsletter (channel). Requires `messages:write` scope (newsletter creation shares the messages write budget).
   */
  async create(
    body: CreateNewsletterParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Newsletter> {
    return this.client.request({
      method: "POST",
      path: "/v1/newsletters",
      body,
      schema: NewsletterSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get newsletter.
   *
   * Retrieve a newsletter by its JID. Requires `newsletters:read` scope.
   */
  async retrieve(id: string, opts: { signal?: AbortSignal } = {}): Promise<Newsletter> {
    return this.client.request({
      method: "GET",
      path: `/v1/newsletters/${id}`,
      schema: NewsletterSchema,
      signal: opts.signal,
    });
  }
}
