import { BaseResource } from "../base-resource";
import { WhatsAppContactSchema, type WhatsAppContact } from "../types/contacts";
import { GroupListItemSchema, type GroupListItem } from "../types/groups";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

export interface ListContactsParams extends ListParams {
  searchToken?: string;
  includeArchive?: boolean;
}

const WhatsAppContactPageSchema = pageSchema(WhatsAppContactSchema);
const GroupListItemPageSchema = pageSchema(GroupListItemSchema);

export class ContactsResource extends BaseResource {
  /**
   * List contacts.
   *
   * List your workspace contact book — everyone the connected WhatsApp account has messaged. Offset-paginated via `limit` + `skip`. Requires `contacts:read`.
   */
  async list(
    params: ListContactsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<WhatsAppContact>> {
    const { signal, searchToken, includeArchive, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (includeArchive !== undefined) query.includeArchive = includeArchive;
    return this.client.request({
      method: "GET",
      path: "/v1/contacts",
      query,
      schema: WhatsAppContactPageSchema,
      signal,
    });
  }

  /**
   * Get common groups.
   *
   * List the groups the connected WhatsApp account shares with this contact (WhatsApp's "groups in common"). `id` is the contact's JID (e.g. `12345@c.us`). Returns the same group list-item shape as `GET /v1/groups`. Requires `groups:read`.
   */
  async listCommonGroups(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Page<GroupListItem>> {
    return this.client.request({
      method: "GET",
      path: `/v1/contacts/${encodeURIComponent(id)}/common_groups`,
      schema: GroupListItemPageSchema,
      signal: opts.signal,
    });
  }
}
