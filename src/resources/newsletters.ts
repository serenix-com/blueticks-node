import { BaseResource } from "../base-resource";
import {
  NewsletterSchema,
  NewsletterListItemSchema,
  type Newsletter,
  type NewsletterListItem,
} from "../types/newsletters";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListNewslettersParams extends ListParams {
  searchToken?: string;
  includeArchive?: boolean;
}

export interface CreateNewsletterParams {
  name: string;
  description?: string;
}

const NewsletterListItemPageSchema = pageSchema(NewsletterListItemSchema);
const NewsletterEnvelope = dataEnvelope(NewsletterSchema);

export class NewslettersResource extends BaseResource {
  /**
   * List newsletters.
   *
   * List newsletters visible to the connected WhatsApp engine. Offset-paginated via `limit` + `skip`. Requires `newsletters:read` scope.
   */
  async list(
    params: ListNewslettersParams & { signal?: AbortSignal } = {},
  ): Promise<Page<NewsletterListItem>> {
    const { signal, searchToken, includeArchive, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (includeArchive !== undefined) query.includeArchive = includeArchive;
    return this.client.request({
      method: "GET",
      path: "/v1/newsletters",
      query,
      schema: NewsletterListItemPageSchema,
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
      schema: NewsletterEnvelope,
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
      path: `/v1/newsletters/${encodeURIComponent(id)}`,
      schema: NewsletterEnvelope,
      signal: opts.signal,
    });
  }
}
