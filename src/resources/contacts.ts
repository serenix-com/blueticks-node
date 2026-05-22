import { BaseResource } from "../base-resource";
import { WhatsAppContactSchema, type WhatsAppContact } from "../types/contacts";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const WhatsAppContactPageSchema = pageSchema(WhatsAppContactSchema);

export interface ListContactsParams extends ListParams {
  query?: string;
}

export class ContactsResource extends BaseResource {
  /**
   * List contacts.
   *
   * Search the user's WhatsApp contacts. Cursor-paginated.
   */
  async list(
    params: ListContactsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<WhatsAppContact>> {
    const { signal, query, ...rest } = params;
    const q = buildListQuery(rest);
    if (query !== undefined) q.query = query;
    return this.client.request({
      method: "GET",
      path: "/v1/contacts",
      query: q,
      schema: WhatsAppContactPageSchema,
      signal,
    });
  }
}
